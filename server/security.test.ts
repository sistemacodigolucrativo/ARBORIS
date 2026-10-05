import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './security';
import { actionSchema, passwordSchema } from './actions';
test('password hashes use unique salts and reject wrong passwords', async () => {
  const first = await hashPassword('correct-password-123');
  const second = await hashPassword('correct-password-123');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('correct-password-123', first), true);
  assert.equal(await verifyPassword('incorrect-password', first), false);
});
test('API rejects actor spoofing, invalid positions and weak passwords', () => {
  assert.equal(actionSchema.safeParse({ action: 'strengthen_tronco', params: { treeId: 1, userId: 1 } }).success, false);
  assert.equal(actionSchema.safeParse({ action: 'assign_tree_position', params: { treeId: 1, positionIndex: 0, userId: 2 } }).success, false);
  assert.equal(passwordSchema.safeParse('123456').success, false);
});
