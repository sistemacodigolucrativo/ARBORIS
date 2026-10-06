import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { createPool, transaction, saveState } from './db';
import { hashPassword } from './security';
import { passwordSchema } from './actions';
import type { RowDataPacket } from 'mysql2/promise';
import type { GameDatabaseState } from '../src/types/game';
const pool = createPool();
try {
  const command = process.argv[2];
  if (command === 'migrate') {
    const db = await pool.getConnection();
    try {
      const [locks] = await db.query<RowDataPacket[]>("SELECT GET_LOCK('arboris_migrations', 30) AS acquired");
      if (locks[0].acquired !== 1) throw new Error('Outra migração está em andamento.');
      await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(200) PRIMARY KEY, checksum CHAR(64) NOT NULL) ENGINE=InnoDB');
      for (const file of (await readdir(resolve('server/migrations'))).filter(f => f.endsWith('.sql')).sort()) {
        const sql = await readFile(resolve('server/migrations', file), 'utf8');
        const checksum = createHash('sha256').update(sql).digest('hex');
        const [rows] = await db.execute<RowDataPacket[]>('SELECT checksum FROM schema_migrations WHERE name=?', [file]);
        if (rows.length) { if (rows[0].checksum !== checksum) throw new Error(`Migração alterada após aplicação: ${file}`); continue; }
        for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) {
          const addColumnIfMissing = statement.match(/^ALTER TABLE ([a-zA-Z0-9_]+) ADD COLUMN IF NOT EXISTS ([a-zA-Z0-9_]+) /i);
          if (!addColumnIfMissing) {
            await db.query(statement);
            continue;
          }

          const [, table, column] = addColumnIfMissing;
          const [columns] = await db.execute<RowDataPacket[]>(
            'SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=? LIMIT 1',
            [table, column]
          );
          if (!columns.length) await db.query(statement.replace(/ADD COLUMN IF NOT EXISTS/i, 'ADD COLUMN'));
        }
        await db.execute('INSERT INTO schema_migrations (name,checksum) VALUES (?,?)', [file, checksum]);
      }
    } finally { await db.query("SELECT RELEASE_LOCK('arboris_migrations')"); db.release(); }
  } else if (command === 'import') {
    const state: any = {};
    for (const [key, file] of Object.entries({ config: 'config', users: 'users', wallets: 'wallets', trees: 'trees', referrals: 'referrals', ledger: 'ledger', auditLog: 'audit-log' })) {
      state[key] = JSON.parse(await readFile(resolve(process.env.IMPORT_DATA_DIR || 'data', `${file}.json`), 'utf8'));
    }
    const bagPath = resolve(process.env.IMPORT_DATA_DIR || 'data', 'planting-bag.json');
    if (existsSync(bagPath)) state.plantingBag = JSON.parse(await readFile(bagPath, 'utf8'));
    await transaction(pool, async db => {
      const [rows] = await db.query<RowDataPacket[]>('SELECT id FROM game_config LIMIT 1');
      const [users] = await db.query<RowDataPacket[]>('SELECT id FROM users LIMIT 1');
      if (rows.length || users.length) throw new Error('Importação recusada: banco já inicializado. Nenhum dado foi sobrescrito.');
      await saveState(db, state as GameDatabaseState);
    }, true);
  } else if (command === 'password') {
    const username = process.env.ACCOUNT_USERNAME;
    if (!username) throw new Error('Defina ACCOUNT_USERNAME.');
    const hash = await hashPassword(passwordSchema.parse(process.env.ACCOUNT_PASSWORD));
    await transaction(pool, async db => {
      const [rows] = await db.execute<RowDataPacket[]>('SELECT id FROM users WHERE username=?', [username]);
      if (!rows.length) throw new Error('Conta não encontrada.');
      await db.execute('INSERT INTO credentials (userId,passwordHash) VALUES (?,?) ON DUPLICATE KEY UPDATE passwordHash=VALUES(passwordHash)', [rows[0].id, hash]);
      await db.execute('DELETE FROM sessions WHERE userId=?', [rows[0].id]);
    }, true);
  } else throw new Error('Comandos: migrate, import, password.');
  console.log('Operação concluída.');
} finally { await pool.end(); }
