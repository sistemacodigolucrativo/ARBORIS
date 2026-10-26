import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app';
import { verifyPassword } from './security';
import type { DatabasePool } from './db';

test('member password reset requires admin, validates input and invalidates sessions', async () => {
  let role: string | null = 'admin';
  let targetRole: string | null = 'participant';
  let storedHash = '';
  let invalidated = false;
  const db = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {},
    query: async () => [[]],
    execute: async (sql: string, values: any[]) => {
      if (sql.startsWith('SELECT u.* FROM sessions')) return [role ? [{ id: 1, role, status: 'active' }] : []];
      if (sql.startsWith('SELECT id, role')) return [targetRole ? [{ id: 2, role: targetRole }] : []];
      if (sql.startsWith('INSERT INTO credentials')) { storedHash = values[1]; return [{}]; }
      if (sql.startsWith('DELETE FROM sessions')) { invalidated = true; return [{}]; }
      throw new Error('Unexpected SQL');
    }
  };
  const app = createApp({ getConnection: async () => db } as unknown as DatabasePool);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address() as { port: number };
  const request = (body: unknown) => fetch(`http://127.0.0.1:${address.port}/api/admin/member-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Arboris-Client': 'web' }, body: JSON.stringify(body)
  });
  const payload = { userId: 2, newPassword: 'Test-password-12345' };
  try {
    role = null; assert.equal((await request(payload)).status, 401);
    role = 'participant'; assert.equal((await request(payload)).status, 403);
    role = 'admin';
    assert.equal((await request({ ...payload, newPassword: 'short' })).status, 400);
    targetRole = 'admin'; assert.equal((await request(payload)).status, 400);
    targetRole = null; assert.equal((await request(payload)).status, 400);
    assert.equal(storedHash, '');
    targetRole = 'participant';
    const response = await request(payload);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true });
    assert.equal(await verifyPassword(payload.newPassword, storedHash), true);
    assert.equal(await verifyPassword('previous-password', storedHash), false);
    assert.equal(invalidated, true);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
