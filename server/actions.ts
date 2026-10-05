import { z } from 'zod';
import type { GameDatabaseState, User } from '../src/types/game';
import { ActionResult, createParticipant, strengthenTronco, transferSeeds, validateReferral } from '../src/services/gameEngine';
import { createTreeByAdmin, archiveTreeByAdmin, deleteTreeByAdmin, deleteUserByAdmin, assignTreePositionByAdmin, clearTreePositionByAdmin } from '../src/services/adminGameEngine';
import { HttpError, newToken } from './security';
const id = z.number().int().positive().max(2147483647);
const text = z.string().trim().min(1).max(80);
export const passwordSchema = z.string().min(12, 'A senha precisa ter pelo menos 12 caracteres.').max(128);
export const registrationSchema = z.object({ firstName: text, lastName: text, indicadorUsername: z.string().trim().min(1).max(200).optional(), password: passwordSchema }).strict();
export const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create_tree'), params: z.object({ categoryId: id, troncoUserId: id }).strict() }),
  z.object({ action: z.literal('archive_tree'), params: z.object({ treeId: id, reason: z.string().trim().max(500).optional() }).strict() }),
  z.object({ action: z.literal('delete_tree'), params: z.object({ treeId: id }).strict() }),
  z.object({ action: z.literal('delete_user'), params: z.object({ userId: id }).strict() }),
  z.object({ action: z.literal('assign_tree_position'), params: z.object({ treeId: id, positionIndex: z.number().int().min(1).max(14), userId: id }).strict() }),
  z.object({ action: z.literal('clear_tree_position'), params: z.object({ treeId: id, positionIndex: z.number().int().min(1).max(14) }).strict() }),
  z.object({ action: z.literal('toggle_user_status'), params: z.object({ userId: id }).strict() }),
  z.object({ action: z.literal('strengthen_tronco'), params: z.object({ treeId: id }).strict() }),
  z.object({ action: z.literal('transfer_seeds'), params: z.object({ toUserId: id, treeId: id, amount: z.number().int().positive().max(1000000), reason: z.string().trim().max(500) }).strict() })
]);
export function register(state: GameDatabaseState, params: z.infer<typeof registrationSchema>, key: string, admin?: User) {
  let indicadorUsername = params.indicadorUsername?.trim();
  if (!indicadorUsername && admin) {
    const activeTree = state.trees.find(t => t.status === 'active');
    if (!activeTree) throw new HttpError(400, 'Não há árvore ativa para vincular o usuário criado pelo coordenador.');
    const activeReferral = state.referrals.find(r => r.treeId === activeTree.id && r.isActive);
    const tronco = state.users.find(u => u.id === activeTree.troncoUserId && u.status === 'active');
    indicadorUsername = activeReferral?.token || tronco?.username;
  }
  if (!indicadorUsername) throw new HttpError(400, 'Indicador obrigatório para cadastro público.');
  const base = `${params.firstName}_${params.lastName}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_]/g, '').slice(0, 80);
  if (base.length < 3) throw new HttpError(400, 'Nome e sobrenome devem formar um usuário com pelo menos 3 caracteres.');
  let username = base, suffix = 2;
  while (state.users.some(u => u.username === username)) username = `${base}_${suffix++}`;
  const ref = validateReferral(state, indicadorUsername);
  if (!ref.valid || !ref.referrer || !ref.tree) throw new HttpError(400, ref.error || 'Indicador inválido.');
  const res = createParticipant(state, { username, name: `${params.firstName} ${params.lastName}`, indicadorUsername, idempotencyKey: key });
  if (!res.success || !res.result) throw new HttpError(400, res.error || 'Cadastro rejeitado.');
  const own = res.state.referrals.find(r => r.id === ref.referral?.id);
  if (own) { own.registrationsCount++; own.referredUserId ??= res.result.user.id; }
  res.state.referrals.push({ id: Math.max(0, ...res.state.referrals.map(r => r.id)) + 1,
    referrerUserId: res.result.user.id, referredUserId: null, treeId: ref.tree.id, token: newToken(),
    clicks: 0, registrationsCount: 0, isActive: true, createdAt: new Date().toISOString() });
  if (admin) {
    const audit = res.state.auditLog.at(-1)!;
    audit.actorUserId = admin.id; audit.actorUsername = admin.username; audit.action = 'ADMIN_PARTICIPANT_REGISTERED';
  }
  return res;
}
export function applyAction(state: GameDatabaseState, user: User, input: z.infer<typeof actionSchema>, key: string): ActionResult {
  const actor = { actorUserId: user.id, actorUsername: user.username };
  if (!['strengthen_tronco', 'transfer_seeds'].includes(input.action) && user.role !== 'admin') throw new HttpError(403, 'Acesso administrativo obrigatório.');
  if (state.config.systemMode !== 'active') throw new HttpError(503, 'Sistema em manutenção.');
  switch (input.action) {
    case 'create_tree': return createTreeByAdmin(state, { ...input.params, actor, idempotencyKey: key });
    case 'archive_tree': return archiveTreeByAdmin(state, { ...input.params, actor, idempotencyKey: key });
    case 'delete_tree': return deleteTreeByAdmin(state, { ...input.params, actor, idempotencyKey: key });
    case 'delete_user': return deleteUserByAdmin(state, { ...input.params, actor, idempotencyKey: key });
    case 'assign_tree_position': return assignTreePositionByAdmin(state, { ...input.params, actor, idempotencyKey: key });
    case 'clear_tree_position': return clearTreePositionByAdmin(state, { ...input.params, actor, idempotencyKey: key });
    case 'strengthen_tronco':
      if (user.role === 'admin') throw new HttpError(403, 'Coordenador não participa deste fluxo.');
      if (state.trees.some(t => t.status === 'active' && t.positions.some(p => p.userId === user.id && p.status === 'occupied'))) throw new HttpError(400, 'Você já ocupa uma posição em árvore ativa.');
      return strengthenTronco(state, { userId: user.id, treeId: input.params.treeId, idempotencyKey: key });
    case 'transfer_seeds': {
      if (input.params.toUserId === user.id) throw new HttpError(400, 'Escolha outro destinatário.');
      if (!state.users.some(u => u.id === input.params.toUserId && u.status === 'active')) throw new HttpError(400, 'Destinatário inativo ou inexistente.');
      if (!state.trees.some(t => t.id === input.params.treeId && t.status === 'active')) throw new HttpError(400, 'Árvore inativa ou inexistente.');
      return transferSeeds(state, { ...input.params, fromUserId: user.id, idempotencyKey: key });
    }
    case 'toggle_user_status': {
      const next = structuredClone(state);
      const target = next.users.find(u => u.id === input.params.userId);
      if (!target || target.role === 'admin') throw new HttpError(400, 'Usuário inexistente ou protegido.');
      target.status = target.status === 'active' ? 'blocked' : 'active'; target.updatedAt = new Date().toISOString();
      next.auditLog.push({ id: Math.max(0, ...next.auditLog.map(a => a.id)) + 1, actorUserId: user.id,
        actorUsername: user.username, action: 'ADMIN_USER_STATUS_CHANGED', entity: 'user', entityId: target.id,
        metadata: { idempotencyKey: key, status: target.status }, createdAt: target.updatedAt });
      return { success: true, state: next, result: { newStatus: target.status } };
    }
  }
}
export function visibleState(state: GameDatabaseState, user: User | null): GameDatabaseState {
  if (user?.role === 'admin') return state;
  const trees = user ? state.trees.filter(t => t.id === user.currentTreeId) : [];
  const ids = new Set([user?.id, ...trees.flatMap(t => t.positions.map(p => p.userId))]);
  return { config: state.config, trees,
    users: user ? state.users.filter(u => ids.has(u.id)).map(({ githubActor, ...u }) => u) : [],
    wallets: state.wallets.filter(w => w.userId === user?.id),
    referrals: state.referrals.filter(r => r.referrerUserId === user?.id),
    ledger: state.ledger.filter(l => l.toUserId === user?.id || l.fromUserId === user?.id), auditLog: [] };
}
