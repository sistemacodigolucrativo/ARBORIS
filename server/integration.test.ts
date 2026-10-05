import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { createPool, transaction, loadState } from './db';
import { createApp } from './app';
import { hashPassword } from './security';

const enabled = Boolean(process.env.TEST_DATABASE_URL);
if (!enabled && process.env.REQUIRE_MYSQL_TESTS === 'true') throw new Error('TEST_DATABASE_URL é obrigatória.');
test('MySQL: authentication, atomic writes, rollback, idempotency and persistence', { skip: !enabled }, async t => {
  const url = new URL(process.env.TEST_DATABASE_URL!);
  assert.match(url.pathname, /_test$/, 'Use exclusivamente um banco descartável terminado em _test.');
  process.env.DATABASE_URL = url.toString();
  process.env.NODE_ENV = 'test';
  process.env.APP_ORIGINS = 'http://localhost:3000';
  delete process.env.COOKIE_CROSS_SITE;
  const pool = createPool();
  execFileSync(process.execPath, ['--import', 'tsx', 'server/manage.ts', 'migrate'], { env: process.env });
  // Import refuses an initialized database: this suite cannot erase existing data.
  execFileSync(process.execPath, ['--import', 'tsx', 'server/manage.ts', 'import'], { env: process.env });
  const password = 'test-only-long-password-123';
  await pool.execute('INSERT INTO credentials (userId,passwordHash) VALUES (1,?)', [await hashPassword(password)]);
  let server = createApp(pool).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  let base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const close = () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  t.after(async () => { await close(); await pool.end(); });
  const call = async (path: string, body?: unknown, cookie = '', key = randomUUID(), headers: Record<string,string> = {}) => {
    const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Arboris-Client': 'web', 'Idempotency-Key': key, Cookie: cookie, ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] || '', headers: response.headers };
  };
  const publicState = await call('/state');
  assert.deepEqual(publicState.data.state.users, []);
  assert.equal((await call('/actions', { action: 'create_tree', params: { categoryId: 1, troncoUserId: 2 } })).status, 401);
  assert.equal((await call('/auth/login', { username: 'admin', password: 'incorrect' })).status, 401);
  const login = await call('/auth/login', { username: 'admin', password });
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie')!, /HttpOnly/);
  const admin = login.cookie;
  assert.equal((await call('/auth/logout', {}, admin, randomUUID(), { Origin: 'https://attacker.invalid' })).status, 403);
  assert.equal((await call('/auth/logout', {}, admin, randomUUID(), { 'X-Arboris-Client': '' })).status, 403);
  const registration = { firstName: 'Integration', lastName: 'Member', indicadorUsername: 'maria', password };
  const key = randomUUID();
  const created = await call('/register', registration, '', key);
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const memberId = created.data.result.user.id;
  assert.equal((await call('/register', registration, '', key)).data.result.user.id, memberId);
  assert.equal((await call('/register', { ...registration, firstName: 'Different' }, '', key)).status, 409);
  const memberLogin = await call('/auth/login', { username: created.data.result.user.username, password });
  const member = memberLogin.cookie;
  const view = await call('/state', undefined, member);
  assert.equal(view.data.state.wallets.length, 1);
  assert.equal(view.data.state.wallets[0].balance, 25);
  assert.deepEqual(view.data.state.auditLog, []);
  assert.equal((await call('/actions', { action: 'create_tree', params: { categoryId: 1, troncoUserId: memberId } }, member)).status, 403);
  assert.equal((await call('/actions', { action: 'strengthen_tronco', params: { treeId: 1, userId: 2 } }, member)).status, 400);
  const ledgerBefore = (await call('/state', undefined, admin)).data.state.ledger.length;
  assert.equal((await call('/actions', { action: 'strengthen_tronco', params: { treeId: 9999 } }, member)).status, 400);
  assert.equal((await call('/state', undefined, admin)).data.state.ledger.length, ledgerBefore);
  const strengthen = { action: 'strengthen_tronco', params: { treeId: 1 } };
  const strengthenKey = randomUUID();
  const simultaneous = await Promise.all([call('/actions', strengthen, member, strengthenKey), call('/actions', strengthen, member, strengthenKey)]);
  assert.deepEqual(simultaneous.map(r => r.status), [200,200]);
  const state = (await call('/state', undefined, admin)).data.state;
  assert.equal(state.ledger.length, ledgerBefore + 1);
  assert.equal(state.wallets.find((w: any) => w.userId === memberId).balance, 0);
  assert.equal(state.trees[0].positions.filter((p: any) => p.userId === memberId).length, 1);
  assert.equal((await call('/actions', strengthen, member)).status, 400);
  // Independent concurrent registrations must preserve every grant and unique ID.
  const concurrent = await Promise.all(['Two','Three'].map(lastName => call('/admin/users', { ...registration, lastName }, admin)));
  assert.deepEqual(concurrent.map(r => r.status), [201,201]);
  assert.notEqual(concurrent[0].data.result.user.id, concurrent[1].data.result.user.id);
  const treeOwner = concurrent[0].data.result.user.id;
  const tree = await call('/actions', { action: 'create_tree', params: { categoryId: 1, troncoUserId: treeOwner } }, admin);
  assert.equal(tree.status, 200, JSON.stringify(tree.data));
  const treeId = tree.data.result.tree.id;
  const assign = await call('/actions', { action: 'assign_tree_position', params: { treeId, positionIndex: 7, userId: concurrent[1].data.result.user.id } }, admin);
  assert.equal(assign.status, 200);
  assert.equal((await call('/actions', { action: 'clear_tree_position', params: { treeId, positionIndex: 7 } }, admin)).status, 200);
  assert.equal((await call('/actions', { action: 'archive_tree', params: { treeId } }, admin)).status, 200);
  // Credentials and sessions survive a real API restart.
  await close(); server = createApp(pool).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  assert.equal((await call('/state', undefined, member)).data.user.id, memberId);
  const anotherPool = createPool();
  try {
    const persisted = await transaction(anotherPool, loadState);
    assert.equal(persisted.users.some(u => u.id === memberId), true);
    assert.equal(persisted.wallets.find(w => w.userId === memberId)?.balance, 0);
  } finally { await anotherPool.end(); }
  // Force an error after a write to prove actual SQL rollback.
  const balanceBeforeRollback = (await call('/state', undefined, admin)).data.state.wallets.find((w: any) => w.userId === 2).balance;
  await assert.rejects(transaction(pool, async db => {
    await db.execute('UPDATE wallets SET balance=balance+100 WHERE userId=2');
    await db.execute('INSERT INTO wallets (userId,balance,updatedAt) VALUES (999999,0,?)', [new Date().toISOString()]);
  }, true));
  assert.equal((await call('/state', undefined, admin)).data.state.wallets.find((w: any) => w.userId === 2).balance, balanceBeforeRollback);
  // Complete the original tree through the API; both children must persist atomically.
  for (let i = 0; i < 7; i++) {
    const entrant = await call('/register', { ...registration, firstName: 'Completion', lastName: `Member${i}` });
    assert.equal(entrant.status, 201, JSON.stringify(entrant.data));
    const entrySession = await call('/auth/login', { username: entrant.data.result.user.username, password });
    const entry = await call('/actions', strengthen, entrySession.cookie);
    assert.equal(entry.status, 200, JSON.stringify(entry.data));
    assert.equal(entry.data.result.bifurcated, i === 6);
  }
  const splitState = (await call('/state', undefined, admin)).data.state;
  assert.equal(splitState.trees.find((tree: any) => tree.id === 1).status, 'completed');
  const children = splitState.trees.filter((tree: any) => tree.parentTreeId === 1);
  assert.equal(children.length, 2);
  assert(children.every((tree: any) => tree.positions.length === 15 && tree.status === 'active'));
  assert.equal((await call('/actions', { action: 'toggle_user_status', params: { userId: memberId } }, admin)).status, 200);
  assert.equal((await call('/actions', strengthen, member)).status, 401);
  assert.equal((await call('/auth/login', { username: created.data.result.user.username, password })).status, 401);
  assert.equal((await call('/actions', { action: 'toggle_user_status', params: { userId: 1 } }, admin)).status, 400);
  assert.equal((await call('/auth/logout', {}, admin)).status, 200);
  assert.equal((await call('/actions', { action: 'archive_tree', params: { treeId: 1 } }, admin)).status, 401);
  // Import never changes source fixtures, and a second import is rejected.
  assert.throws(() => execFileSync(process.execPath, ['--import', 'tsx', 'server/manage.ts', 'import'], { env: process.env, stdio: 'pipe' }));
  const fixtures = JSON.parse(await readFile('data/users.json', 'utf8'));
  assert.equal(fixtures.some((u: any) => u.id === memberId), false);
  const [credentials] = await pool.query<RowDataPacket[]>('SELECT passwordHash FROM credentials');
  assert(credentials.every(c => c.passwordHash.startsWith('scrypt:') && !c.passwordHash.includes(password)));
});
