import mysql, { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { GameDatabaseState } from '../src/types/game';

export function createPool() {
  if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL no servidor.');
  return mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 10, timezone: 'Z',
    charset: 'utf8mb4', multipleStatements: false, jsonStrings: true,
    ...(process.env.MYSQL_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}) });
}
export type DatabasePool = ReturnType<typeof createPool>;
export async function transaction<T>(pool: DatabasePool, fn: (db: PoolConnection) => Promise<T>, lock = false): Promise<T> {
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    if (lock) await db.query('SELECT id FROM game_lock WHERE id = 1 FOR UPDATE');
    const result = await fn(db);
    await db.commit();
    return result;
  } catch (error) { await db.rollback(); throw error; }
  finally { db.release(); }
}
const descriptors = [
  ['users','users','id','id username name githubActor role status createdAt updatedAt currentTreeId currentPositionIndex'],
  ['wallets','wallets','userId','userId balance updatedAt'],
  ['trees','trees','id','id categoryId treeCode troncoUserId status cycleNumber parentTreeId createdAt completedAt'],
  ['referrals','referrals','id','id referrerUserId referredUserId treeId token clicks registrationsCount isActive createdAt'],
  ['ledger','ledger','id','id type fromUserId toUserId treeId amount reason idempotencyKey createdAt fromUsername toUsername'],
  ['auditLog','audit_log','id','id actorUserId action entity entityId metadata createdAt actorUsername']
] as const;
const jsonFields = new Set(['entityId','metadata']);
const parseJson = (value: any) => typeof value === 'string' ? JSON.parse(value) : value;
export async function loadState(db: PoolConnection): Promise<GameDatabaseState> {
  const [configRows] = await db.query<RowDataPacket[]>('SELECT config FROM game_config WHERE id = 1');
  if (!configRows.length) throw new Error('Banco não inicializado. Execute db:import.');
  const state: any = { config: parseJson(configRows[0].config) };
  for (const [key, table] of descriptors) {
    const [rows] = await db.query<RowDataPacket[]>(`SELECT * FROM \`${table}\` ORDER BY ${key === 'wallets' ? 'userId' : 'id'}`);
    state[key] = rows.map(row => ({ ...row }));
  }
  state.referrals.forEach((r: any) => { r.isActive = Boolean(r.isActive); });
  state.auditLog.forEach((a: any) => { a.entityId = parseJson(a.entityId); a.metadata = parseJson(a.metadata); });
  const [positions] = await db.query<RowDataPacket[]>('SELECT * FROM tree_positions ORDER BY treeId, `index`');
  state.trees.forEach((t: any) => { t.positions = positions.filter(p => p.treeId === t.id).map(({ treeId, ...p }) => p); });
  return state;
}
async function upsert(db: PoolConnection, table: string, columns: string[], row: any) {
  const cols = columns.map(c => `\`${c}\``);
  const values = columns.map(c => jsonFields.has(c) ? JSON.stringify(row[c]) : row[c] ?? null);
  await db.execute(`INSERT INTO \`${table}\` (${cols.join(',')}) VALUES (${columns.map(() => '?').join(',')}) ON DUPLICATE KEY UPDATE ${cols.map(c => `${c}=VALUES(${c})`).join(',')}`, values);
}
async function executeForIds(db: PoolConnection, sqlPrefix: string, ids: number[], sqlSuffix = '') {
  if (!ids.length) return;
  await db.execute(`${sqlPrefix} (${ids.map(() => '?').join(',')})${sqlSuffix}`, ids);
}

async function deleteRemovedRows(db: PoolConnection, state: GameDatabaseState, previous: GameDatabaseState) {
  const nextTreeIds = new Set(state.trees.map(tree => tree.id));
  const removedTreeIds = previous.trees.filter(tree => !nextTreeIds.has(tree.id)).map(tree => tree.id);
  if (removedTreeIds.length) {
    await executeForIds(db, 'DELETE FROM tree_positions WHERE treeId IN', removedTreeIds);
    await executeForIds(db, 'DELETE FROM referrals WHERE treeId IN', removedTreeIds);
    await executeForIds(db, 'DELETE FROM ledger WHERE treeId IN', removedTreeIds);
    await executeForIds(db, 'DELETE FROM trees WHERE id IN', removedTreeIds);
  }

  const nextUserIds = new Set(state.users.map(user => user.id));
  const removedUserIds = previous.users.filter(user => !nextUserIds.has(user.id)).map(user => user.id);
  if (removedUserIds.length) {
    await executeForIds(db, 'DELETE FROM sessions WHERE userId IN', removedUserIds);
    await executeForIds(db, 'DELETE FROM credentials WHERE userId IN', removedUserIds);
    await executeForIds(db, 'DELETE FROM wallets WHERE userId IN', removedUserIds);
    const placeholders = removedUserIds.map(() => '?').join(',');
    await db.execute(`DELETE FROM referrals WHERE referrerUserId IN (${placeholders}) OR referredUserId IN (${placeholders})`, [...removedUserIds, ...removedUserIds]);
    await db.execute(`DELETE FROM ledger WHERE fromUserId IN (${placeholders}) OR toUserId IN (${placeholders})`, [...removedUserIds, ...removedUserIds]);
    await executeForIds(db, "UPDATE tree_positions SET userId=NULL,status='vacant',occupiedAt=NULL,username=NULL,name=NULL WHERE userId IN", removedUserIds);
    await executeForIds(db, 'DELETE FROM users WHERE id IN', removedUserIds);
  }
}

export async function saveState(db: PoolConnection, state: GameDatabaseState, previous?: GameDatabaseState) {
  if (!previous || JSON.stringify(previous.config) !== JSON.stringify(state.config)) {
    await db.execute('INSERT INTO game_config (id,config) VALUES (1,?) ON DUPLICATE KEY UPDATE config=VALUES(config)', [JSON.stringify(state.config)]);
  }
  if (previous) await deleteRemovedRows(db, state, previous);
  for (const [key, table, primary, fields] of descriptors) {
    const before = new Map((previous?.[key] as any[] || []).map(r => [r[primary], r]));
    for (const row of state[key] as any[]) {
      if (JSON.stringify(row) === JSON.stringify(before.get(row[primary]))) continue;
      await upsert(db, table, fields.split(' '), row);
      if (key === 'trees') {
        await db.execute('DELETE FROM tree_positions WHERE treeId = ?', [row.id]);
        for (const position of row.positions) await upsert(db, 'tree_positions',
          'treeId index level side userId status occupiedAt username name'.split(' '), { treeId: row.id, ...position });
      }
    }
  }
}
