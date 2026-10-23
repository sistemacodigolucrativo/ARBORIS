import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, HttpError, verifyPassword } from './security';
import { actionSchema, applyAction, passwordSchema } from './actions';
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
test('member panel layout accepts only supported saved options', () => {
  assert.equal(actionSchema.safeParse({ action: 'set_member_panel_layout', params: { layout: 'classic' } }).success, true);
  assert.equal(actionSchema.safeParse({ action: 'set_member_panel_layout', params: { layout: 'aurora' } }).success, true);
  assert.equal(actionSchema.safeParse({ action: 'set_member_panel_layout', params: { layout: 'experimental' } }).success, false);
});
test('only admins can change the global member panel layout and changes are audited', () => {
  const state = { config: { systemMode: 'active', memberPanelLayout: 'classic' }, auditLog: [] } as any;
  const action = actionSchema.parse({ action: 'set_member_panel_layout', params: { layout: 'aurora' } });
  const member = { id: 2, username: 'member', role: 'member' } as any;
  const admin = { id: 1, username: 'coord', role: 'admin' } as any;

  assert.throws(() => applyAction(state, member, action, 'member-layout-test'), (error: unknown) =>
    error instanceof HttpError && error.status === 403
  );

  const result = applyAction(state, admin, action, 'admin-layout-test');
  assert.equal(result.success, true);
  assert.equal(result.state.config.memberPanelLayout, 'aurora');
  assert.equal(result.state.auditLog.at(-1)?.action, 'ADMIN_MEMBER_PANEL_LAYOUT_CHANGED');
});
test('an existing config without a saved layout can persist the classic default', () => {
  const legacyState = { config: { systemMode: 'active' }, auditLog: [] } as any;
  const admin = { id: 1, username: 'coord', role: 'admin' } as any;
  const action = actionSchema.parse({ action: 'set_member_panel_layout', params: { layout: 'classic' } });

  const result = applyAction(legacyState, admin, action, 'legacy-layout-test');

  assert.equal(result.success, true);
  assert.equal(result.state.config.memberPanelLayout, 'classic');
  assert.equal(result.state.auditLog.length, 0);
});
