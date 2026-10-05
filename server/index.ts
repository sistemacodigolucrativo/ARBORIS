import { createPool } from './db';
import { createApp } from './app';
const pool = createPool();
await pool.query('SELECT 1');
const server = createApp(pool).listen(Number(process.env.PORT || 3001), process.env.HOST || '0.0.0.0', () => console.log('Arboris API ready'));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  server.close(() => { void pool.end().then(() => process.exit(0)); });
  setTimeout(() => process.exit(1), 10000).unref();
});
