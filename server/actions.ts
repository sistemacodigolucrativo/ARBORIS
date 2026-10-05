import { z } from 'zod';
import type { GameDatabaseState, User } from '../src/types/game';
import { ActionResult, createParticipant, reserveTreeEntry, strengthenTronco, transferSeeds, validateReferral, splitTreeIfComplete } from '../src/services/gameEngine';
import { createTreeByAdmin, archiveTreeByAdmin, deleteTreeByAdmin, deleteUserByAdmin, updateTreeNicknameByAdmin, assignTreePositionByAdmin, clearTreePositionByAdmin } from '../src/services/adminGameEngine';
import { HttpError, newToken } from './security';
const id = z.number().int().positive().max(2147483647);
const text = z.string().trim().min(1).max(80);
const pixKeyTypeSchema = z.enum(['random', 'email', 'phone']);
const pixHolderSchema = z.string().trim().min(1).max(120);
const pixKeySchema = z.string().trim().min(1).max(200);
export const passwordSchema = z.string().min(12, 'A senha precisa ter pelo menos 12 caracteres.').max(128);
export const registrationSchema = z.object({ firstName: text, lastName: text, indicadorUsername: z.string().trim().min(1).max(200).optional(), password: passwordSchema }).strict();
export const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create_tree'), params: z.object({ categoryId: id, troncoUserId: id }).strict() }),
  z.object({ action: z.literal('archive_tree'), params: z.object({ treeId: id, reason: z.string().trim().max(500).optional() }).strict() }),
  z.object({ action: z.literal('delete_tree'), params: z.object({ treeId: id }).strict() }),
  z.object({ action: z.literal('delete_user'), params: z.object({ userId: id }).strict() }),
  z.object({ action: z.literal('update_tree_nickname'), params: z.object({ treeId: id, nickname: z.string().trim().max(120).optional() }).strict() }),
  z.object({ action: z.literal('reserve_tree_entry'), params: z.object({ treeId: id }).strict() }),
  z.object({ action: z.literal('update_pix'), params: z.object({ holderName: pixHolderSchema, keyType: pixKeyTypeSchema, key: pixKeySchema }).strict() }),
  z.object({ action: z.literal('clear_pix'), params: z.object({}).strict() }),
  z.object({ action: z.literal('request_activation'), params: z.object({ treeId: id }).strict() }),
  z.object({ action: z.literal('approve_activation_request'), params: z.object({ requestId: id }).strict() }),
  z.object({ action: z.literal('reject_activation_request'), params: z.object({ requestId: id, reason: z.string().trim().max(300).optional() }).strict() }),
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

function nextLocalId(items: Array<{ id: number }> | undefined): number {
  return Math.max(0, ...(items || []).map(item => item.id)) + 1;
}

function pixTypeLabel(type: string | null | undefined): string {
  if (type === 'phone') return 'Telefone';
  if (type === 'email') return 'E-mail';
  return 'Aleatória';
}

function ensureActivationRequests(state: GameDatabaseState) {
  return (state.activationRequests ??= []);
}

export function applyAction(state: GameDatabaseState, user: User, input: z.infer<typeof actionSchema>, key: string): ActionResult {
  const actor = { actorUserId: user.id, actorUsername: user.username };
  if (!['reserve_tree_entry', 'strengthen_tronco', 'transfer_seeds', 'update_pix', 'clear_pix', 'request_activation', 'approve_activation_request', 'reject_activation_request'].includes(input.action) && user.role !== 'admin') throw new HttpError(403, 'Acesso administrativo obrigatório.');
  if (state.config.systemMode !== 'active') throw new HttpError(503, 'Sistema em manutenção.');
  switch (input.action) {
    case 'create_tree': return createTreeByAdmin(state, { ...input.params, actor, idempotencyKey: key });
    case 'archive_tree': return archiveTreeByAdmin(state, { ...input.params, actor, idempotencyKey: key });
    case 'delete_tree': return deleteTreeByAdmin(state, { ...input.params, actor, idempotencyKey: key });
    case 'delete_user': return deleteUserByAdmin(state, { ...input.params, actor, idempotencyKey: key });
    case 'update_tree_nickname': return updateTreeNicknameByAdmin(state, { ...input.params, actor, idempotencyKey: key });
    case 'reserve_tree_entry':
      if (user.role === 'admin') throw new HttpError(403, 'Coordenador não participa deste fluxo.');
      return reserveTreeEntry(state, { userId: user.id, treeId: input.params.treeId, idempotencyKey: key });
    case 'update_pix': {
      const next = structuredClone(state);
      const target = next.users.find(u => u.id === user.id);
      if (!target || target.status !== 'active') throw new HttpError(400, 'Participante inativo ou inexistente.');
      target.pixHolderName = input.params.holderName;
      target.pixKeyType = input.params.keyType;
      target.pixKey = input.params.key;
      target.updatedAt = new Date().toISOString();
      next.auditLog.push({
        id: Math.max(0, ...next.auditLog.map(a => a.id)) + 1,
        actorUserId: user.id,
        actorUsername: user.username,
        action: 'USER_PIX_UPDATED',
        entity: 'user',
        entityId: user.id,
        metadata: { idempotencyKey: key, keyType: input.params.keyType },
        createdAt: target.updatedAt
      });
      return { success: true, state: next, result: { pixHolderName: target.pixHolderName, pixKeyType: target.pixKeyType, pixKey: target.pixKey } };
    }
    case 'clear_pix': {
      const next = structuredClone(state);
      const target = next.users.find(u => u.id === user.id);
      if (!target || target.status !== 'active') throw new HttpError(400, 'Participante inativo ou inexistente.');
      target.pixHolderName = null;
      target.pixKeyType = null;
      target.pixKey = null;
      target.updatedAt = new Date().toISOString();
      next.auditLog.push({
        id: Math.max(0, ...next.auditLog.map(a => a.id)) + 1,
        actorUserId: user.id,
        actorUsername: user.username,
        action: 'USER_PIX_CLEARED',
        entity: 'user',
        entityId: user.id,
        metadata: { idempotencyKey: key },
        createdAt: target.updatedAt
      });
      return { success: true, state: next, result: { pixHolderName: null, pixKeyType: null, pixKey: null } };
    }
    case 'request_activation': {
      if (user.role === 'admin') throw new HttpError(403, 'Coordenador não participa deste fluxo.');
      const next = structuredClone(state);
      const requests = ensureActivationRequests(next);
      const tree = next.trees.find(t => t.id === input.params.treeId && t.status === 'active');
      if (!tree) return { success: false, state, error: 'Árvore ativa não encontrada.' };
      const position = tree.positions.find(p => p.userId === user.id && p.status === 'occupied');
      if (!position) return { success: false, state, error: 'Reserve sua vaga antes de solicitar ativação.' };
      if ((position.activationStatus ?? 'active') === 'active') return { success: false, state, error: 'Sua vaga já está ativada.' };
      const requester = next.users.find(u => u.id === user.id && u.status === 'active');
      const tronco = next.users.find(u => u.id === tree.troncoUserId && u.status === 'active');
      if (!requester || !tronco) return { success: false, state, error: 'Participante ou tronco não encontrado.' };
      if (!tronco.pixHolderName || !tronco.pixKeyType || !tronco.pixKey) {
        return { success: false, state, error: 'O tronco ainda não cadastrou uma chave Pix para ativação.' };
      }
      const pending = requests.find(r => r.requesterUserId === requester.id && r.treeId === tree.id && r.status === 'pending');
      if (pending) return { success: true, state: next, result: { request: pending, alreadyPending: true } };
      const category = next.config.categories.find(c => c.id === tree.categoryId);
      const amount = category?.tokenRequirement || next.config.transferAmount || 25;
      const message = `Eu, @${requester.username}, acabei de fazer a minha doação para você e preciso da minha ativação.`;
      const request = {
        id: nextLocalId(requests),
        requesterUserId: requester.id,
        troncoUserId: tronco.id,
        treeId: tree.id,
        positionIndex: position.index,
        amount,
        status: 'pending' as const,
        requesterUsername: requester.username,
        troncoUsername: tronco.username,
        whatsappMessage: message,
        createdAt: new Date().toISOString(),
        decidedAt: null,
        decisionNote: null
      };
      requests.push(request);
      next.auditLog.push({
        id: nextLocalId(next.auditLog),
        actorUserId: requester.id,
        actorUsername: requester.username,
        action: 'PIX_ACTIVATION_REQUESTED',
        entity: 'activation_request',
        entityId: request.id,
        metadata: { idempotencyKey: key, treeId: tree.id, positionIndex: position.index, troncoUserId: tronco.id, amount },
        createdAt: request.createdAt
      });
      return { success: true, state: next, result: { request, troncoPix: { holderName: tronco.pixHolderName, keyType: tronco.pixKeyType, key: tronco.pixKey, keyTypeLabel: pixTypeLabel(tronco.pixKeyType) }, whatsappMessage: message } };
    }
    case 'approve_activation_request': {
      const next = structuredClone(state);
      const requests = ensureActivationRequests(next);
      const request = requests.find(r => r.id === input.params.requestId);
      if (!request || request.status !== 'pending') return { success: false, state, error: 'Solicitação pendente não encontrada.' };
      if (user.role !== 'admin' && request.troncoUserId !== user.id) throw new HttpError(403, 'Somente o tronco desta árvore pode aprovar a ativação.');
      const tree = next.trees.find(t => t.id === request.treeId && t.status === 'active');
      const requester = next.users.find(u => u.id === request.requesterUserId && u.status === 'active');
      const tronco = next.users.find(u => u.id === request.troncoUserId && u.status === 'active');
      if (!tree || !requester || !tronco) return { success: false, state, error: 'Árvore, participante ou tronco não encontrado.' };
      const position = tree.positions.find(p => p.index === request.positionIndex && p.userId === requester.id && p.status === 'occupied');
      if (!position) return { success: false, state, error: 'A posição reservada não foi encontrada.' };
      if ((position.activationStatus ?? 'active') === 'active') return { success: false, state, error: 'Esta posição já está ativada.' };
      const fromWallet = next.wallets.find(w => w.userId === requester.id);
      const toWallet = next.wallets.find(w => w.userId === tronco.id);
      if (!fromWallet || fromWallet.balance < request.amount) return { success: false, state, error: 'Saldo de sementes insuficiente para ativação.' };
      if (!toWallet) return { success: false, state, error: 'Carteira do tronco não encontrada.' };
      const now = new Date().toISOString();
      fromWallet.balance -= request.amount;
      fromWallet.updatedAt = now;
      toWallet.balance += request.amount;
      toWallet.updatedAt = now;
      position.activationStatus = 'active';
      requester.updatedAt = now;
      request.status = 'approved';
      request.decidedAt = now;
      request.decisionNote = 'Ativação aprovada pelo tronco.';
      next.ledger.push({
        id: nextLocalId(next.ledger),
        type: 'FORTALECIMENTO_TRONCO',
        fromUserId: requester.id,
        toUserId: tronco.id,
        treeId: tree.id,
        amount: request.amount,
        reason: `Ativação Pix confirmada pelo tronco: posição #${position.index} na Árvore ${tree.treeCode}`,
        idempotencyKey: key,
        fromUsername: requester.username,
        toUsername: tronco.username,
        createdAt: now
      });
      next.auditLog.push({
        id: nextLocalId(next.auditLog),
        actorUserId: user.id,
        actorUsername: user.username,
        action: 'PIX_ACTIVATION_APPROVED',
        entity: 'activation_request',
        entityId: request.id,
        metadata: { idempotencyKey: key, treeId: tree.id, requesterUserId: requester.id, troncoUserId: tronco.id, amount: request.amount },
        createdAt: now
      });
      const activeCount = tree.positions.filter(p => p.status === 'occupied' && (p.activationStatus ?? 'active') === 'active').length;
      if (activeCount === 15) {
        const split = splitTreeIfComplete(next, tree.id);
        if (split.success) return { success: true, state: split.state, result: { requestId: request.id, status: 'approved', bifurcated: true, newTrees: split.result?.newTrees || [] } };
      }
      return { success: true, state: next, result: { requestId: request.id, status: 'approved', bifurcated: false } };
    }
    case 'reject_activation_request': {
      const next = structuredClone(state);
      const requests = ensureActivationRequests(next);
      const request = requests.find(r => r.id === input.params.requestId);
      if (!request || request.status !== 'pending') return { success: false, state, error: 'Solicitação pendente não encontrada.' };
      if (user.role !== 'admin' && request.troncoUserId !== user.id) throw new HttpError(403, 'Somente o tronco desta árvore pode recusar a ativação.');
      const now = new Date().toISOString();
      request.status = 'rejected';
      request.decidedAt = now;
      request.decisionNote = input.params.reason || 'Ativação recusada pelo tronco.';
      next.auditLog.push({
        id: nextLocalId(next.auditLog),
        actorUserId: user.id,
        actorUsername: user.username,
        action: 'PIX_ACTIVATION_REJECTED',
        entity: 'activation_request',
        entityId: request.id,
        metadata: { idempotencyKey: key, treeId: request.treeId, requesterUserId: request.requesterUserId, reason: request.decisionNote },
        createdAt: now
      });
      return { success: true, state: next, result: { requestId: request.id, status: 'rejected' } };
    }
    case 'assign_tree_position': return assignTreePositionByAdmin(state, { ...input.params, actor, idempotencyKey: key });
    case 'clear_tree_position': return clearTreePositionByAdmin(state, { ...input.params, actor, idempotencyKey: key });
    case 'strengthen_tronco':
      if (user.role === 'admin') throw new HttpError(403, 'Coordenador não participa deste fluxo.');
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
    ledger: state.ledger.filter(l => l.toUserId === user?.id || l.fromUserId === user?.id),
    activationRequests: state.activationRequests?.filter(r => r.requesterUserId === user?.id || r.troncoUserId === user?.id) || [],
    auditLog: [] };
}
