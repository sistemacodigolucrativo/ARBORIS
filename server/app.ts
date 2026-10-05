import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z, ZodError } from 'zod';
import { resolve } from 'node:path';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { User } from '../src/types/game';
import { validateReferral } from '../src/services/gameEngine';
import { DatabasePool, transaction, loadState, saveState } from './db';
import { digest, newToken, hashPassword, verifyPassword, HttpError } from './security';
import { registrationSchema, actionSchema, register, applyAction, visibleState } from './actions';

const cookieName = 'arboris_session';
function sessionHash(req: express.Request) {
  const token = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? digest(token) : '';
}
async function authenticated(db: PoolConnection, req: express.Request, required = true): Promise<User | null> {
  const [rows] = await db.execute<RowDataPacket[]>('SELECT u.* FROM sessions s JOIN users u ON u.id=s.userId WHERE s.tokenHash=? AND s.expiresAt>UTC_TIMESTAMP() AND u.status=\'active\'', [sessionHash(req)]);
  if (!rows.length && required) throw new HttpError(401, 'Entre com usuário e senha.');
  return rows[0] as User || null;
}
function requestKey(req: express.Request) {
  return z.string().min(16).max(128).regex(/^[a-zA-Z0-9_-]+$/).parse(req.get('Idempotency-Key'));
}
async function idempotent(db: PoolConnection, req: express.Request, actorId: number, payload: unknown, run: (key: string) => Promise<any>) {
  const key = requestKey(req), fingerprint = digest(JSON.stringify(payload));
  const [rows] = await db.execute<RowDataPacket[]>('SELECT * FROM action_requests WHERE requestKey=?', [key]);
  if (rows.length) {
    if (rows[0].actorId !== actorId || rows[0].requestHash !== fingerprint) throw new HttpError(409, 'Chave de operação já usada com outros dados.');
    return typeof rows[0].result === 'string' ? JSON.parse(rows[0].result) : rows[0].result;
  }
  const result = await run(key);
  await db.execute('INSERT INTO action_requests (requestKey,actorId,requestHash,result) VALUES (?,?,?,?)', [key, actorId, fingerprint, JSON.stringify(result)]);
  return result;
}
export function createApp(pool: DatabasePool) {
  const app = express();
  app.disable('x-powered-by');
  const origins = (process.env.APP_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',').map(s => s.trim());
  const production = process.env.NODE_ENV === 'production';
  const crossSite = process.env.COOKIE_CROSS_SITE === 'true';
  if (crossSite && !production) throw new Error('Cookies entre sites exigem NODE_ENV=production e HTTPS.');
  if (process.env.TRUST_PROXY_HOPS) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
  app.use(helmet({ contentSecurityPolicy: { directives: { 'connect-src': ["'self'", ...origins, ...(process.env.PUBLIC_API_ORIGIN ? [process.env.PUBLIC_API_ORIGIN] : [])], 'img-src': ["'self'", 'data:', 'https:'], 'style-src': ["'self'", "'unsafe-inline'"] } } }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const origin = req.get('Origin');
    if (origin && !origins.includes(origin)) return next(new HttpError(403, 'Origem não autorizada.'));
    if (origin) { res.set('Access-Control-Allow-Origin', origin); res.set('Access-Control-Allow-Credentials', 'true'); res.vary('Origin'); }
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Arboris-Client, Idempotency-Key');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    if (req.method !== 'GET' && (req.get('X-Arboris-Client') !== 'web' || !req.is('application/json'))) return next(new HttpError(403, 'Cabeçalhos da requisição inválidos.'));
    next();
  });
  app.use('/api', express.json({ limit: '16kb' }));
  const limited = (limit: number) => rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: 'Muitas tentativas. Aguarde e tente novamente.' } });
  app.use('/api', limited(1000));
  const authLimit = limited(30);
  const cookieOptions = { httpOnly: true, secure: production, sameSite: crossSite ? 'none' as const : 'lax' as const, path: '/api' };
  const dummyHash = hashPassword(newToken());
  app.get('/api/health', async (_req, res) => {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM game_config WHERE id=1');
    if (!rows.length) throw new HttpError(503, 'Banco não inicializado.');
    res.json({ ok: true });
  });
  app.get('/api/state', async (req, res) => {
    res.json(await transaction(pool, async db => {
      const user = await authenticated(db, req, false), state = await loadState(db);
      return { success: true, state: visibleState(state, user), user };
    }));
  });
  app.post('/api/auth/login', authLimit, async (req, res) => {
    const params = z.object({ username: z.string().trim().min(3).max(100), password: z.string().min(1).max(128) }).strict().parse(req.body);
    const token = newToken();
    const user = await transaction(pool, async db => {
      const [rows] = await db.execute<RowDataPacket[]>('SELECT u.*, c.passwordHash FROM users u JOIN credentials c ON c.userId=u.id WHERE u.username=?', [params.username]);
      const valid = await verifyPassword(params.password, rows[0]?.passwordHash || await dummyHash);
      if (!valid || !rows.length || rows[0].status !== 'active') throw new HttpError(401, 'Usuário ou senha inválidos.');
      await db.execute('DELETE FROM sessions WHERE expiresAt<=UTC_TIMESTAMP() OR tokenHash=?', [sessionHash(req)]);
      await db.execute('INSERT INTO sessions (tokenHash,userId,expiresAt) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 12 HOUR))', [digest(token), rows[0].id]);
      const { passwordHash, ...u } = rows[0]; return u;
    }, true);
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: 12 * 60 * 60 * 1000 }).json({ success: true, user });
  });
  app.post('/api/auth/logout', async (req, res) => {
    await pool.execute('DELETE FROM sessions WHERE tokenHash=?', [sessionHash(req)]);
    res.clearCookie(cookieName, cookieOptions).json({ success: true });
  });
  app.get('/api/referrals/validate', authLimit, async (req, res) => {
    const value = z.string().min(1).max(200).parse(req.query.value);
    const data = await transaction(pool, async db => {
      const state = await loadState(db), ref = validateReferral(state, value);
      if (!ref.valid || !ref.tree || !ref.referrer) throw new HttpError(400, ref.error || 'Indicador inválido.');
      const cat = state.config.categories.find(c => c.id === ref.tree!.categoryId);
      const tronco = state.users.find(u => u.id === ref.tree!.troncoUserId);
      return { username: ref.referrer.username, full_name: ref.referrer.name, tree_id: ref.tree.id, tree_code: ref.tree.treeCode,
        category_name: cat?.name, token_requirement: cat?.tokenRequirement, tronco_full_name: tronco?.name, tronco_username: tronco?.username };
    });
    res.json({ success: true, data });
  });
  for (const route of ['/api/register', '/api/admin/users']) app.post(route, authLimit, async (req, res) => {
    const params = registrationSchema.parse(req.body);
    const passwordHash = await hashPassword(params.password);
    const result = await transaction(pool, async db => {
      const user = route.includes('/admin/') ? await authenticated(db, req) : null;
      if (user && user.role !== 'admin') throw new HttpError(403, 'Acesso administrativo obrigatório.');
      const { password, ...publicParams } = params;
      return idempotent(db, req, user?.id || 0, { route, ...publicParams }, async key => {
        const state = await loadState(db);
        if (state.config.systemMode !== 'active') throw new HttpError(503, 'Sistema em manutenção.');
        const mutation = register(state, params, key, user || undefined);
        await saveState(db, mutation.state, state);
        await db.execute('INSERT INTO credentials (userId,passwordHash) VALUES (?,?)', [mutation.result!.user.id, passwordHash]);
        return { success: true, result: mutation.result };
      });
    }, true);
    res.status(201).json(result);
  });
  app.post('/api/actions', async (req, res) => {
    const input = actionSchema.parse(req.body);
    const result = await transaction(pool, async db => {
      const user = (await authenticated(db, req))!;
      return idempotent(db, req, user.id, input, async key => {
        const state = await loadState(db), mutation = applyAction(state, user, input, key);
        if (!mutation.success) throw new HttpError(400, mutation.error || 'Ação rejeitada.');
        await saveState(db, mutation.state, state);
        if (input.action === 'toggle_user_status') await db.execute('DELETE FROM sessions WHERE userId=?', [input.params.userId]);
        return { success: true, result: mutation.result };
      });
    }, true);
    res.json(result);
  });
  app.use('/api', (_req, res) => { res.status(404).json({ success: false, error: 'Rota não encontrada.' }); });
  app.use('/ARBORIS', express.static(resolve('dist'), { index: 'index.html' }));
  app.get('/', (_req, res) => { res.redirect('/ARBORIS/'); });
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = error instanceof HttpError ? error.status : error instanceof ZodError || error.type === 'entity.parse.failed' ? 400 : error.type === 'entity.too.large' ? 413 : 500;
    if (status === 500) console.error('API request failed:', error.code || error.name);
    res.status(status).json({ success: false, error: error instanceof HttpError ? error.message : status === 400 ? 'Dados inválidos. Confira os campos e a senha (12 a 128 caracteres).' : status === 413 ? 'Requisição muito grande.' : 'Falha interna. Tente novamente.' });
  });
  return app;
}
