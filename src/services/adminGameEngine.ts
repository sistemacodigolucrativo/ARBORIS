import {
  AuditLogEntry,
  GameDatabaseState,
  Referral,
  Tree,
  TreePosition,
  User
} from '../types/game';
import { TOPOLOGY } from './gameEngine';

export interface AdminActionResult<T = any> {
  success: boolean;
  state: GameDatabaseState;
  result?: T;
  error?: string;
}

type AdminActor = {
  actorUserId: number;
  actorUsername?: string;
  githubActor?: string | null;
};

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function nowIso(): string {
  return new Date().toISOString();
}

function hasConsumedIdempotencyKey(state: GameDatabaseState, idempotencyKey?: string): boolean {
  if (!idempotencyKey) return false;
  return state.ledger.some(entry => entry.idempotencyKey === idempotencyKey)
    || state.auditLog.some(entry => entry.metadata?.idempotencyKey === idempotencyKey);
}

function nextId(items: Array<{ id: number }>): number {
  return Math.max(0, ...items.map(item => item.id)) + 1;
}

function createEmptyPositions(tronco: User, createdAt: string): TreePosition[] {
  return TOPOLOGY.map(topo => ({
    index: topo.index,
    level: topo.level,
    side: topo.side,
    userId: topo.index === 0 ? tronco.id : null,
    status: topo.index === 0 ? 'occupied' : 'vacant',
    occupiedAt: topo.index === 0 ? createdAt : null,
    username: topo.index === 0 ? tronco.username : null,
    name: topo.index === 0 ? tronco.name : null
  }));
}

function appendAudit(
  state: GameDatabaseState,
  actor: AdminActor,
  action: string,
  entity: string,
  entityId: number | string,
  metadata: Record<string, any>
): AuditLogEntry {
  const audit: AuditLogEntry = {
    id: nextId(state.auditLog),
    actorUserId: actor.actorUserId,
    actorUsername: actor.actorUsername || actor.githubActor || 'admin',
    action,
    entity,
    entityId,
    metadata,
    createdAt: nowIso()
  };
  state.auditLog.push(audit);
  return audit;
}

function findAdminActor(state: GameDatabaseState, actor: AdminActor): User | null {
  return state.users.find(user => user.id === actor.actorUserId && user.role === 'admin' && user.status === 'active') || null;
}

function assertAdmin(state: GameDatabaseState, actor: AdminActor): string | null {
  const admin = findAdminActor(state, actor);
  if (!admin) return 'Ação administrativa rejeitada: ator não é admin ativo.';
  return null;
}

export function createTreeByAdmin(
  originalState: GameDatabaseState,
  params: {
    categoryId: number;
    troncoUserId: number;
    actor: AdminActor;
    idempotencyKey: string;
  }
): AdminActionResult<{ tree: Tree; referral: Referral }> {
  const state = deepClone(originalState);
  const now = nowIso();

  const adminError = assertAdmin(state, params.actor);
  if (adminError) return { success: false, state: originalState, error: adminError };
  if (hasConsumedIdempotencyKey(state, params.idempotencyKey)) {
    return { success: false, state: originalState, error: 'Operação administrativa já processada.' };
  }

  const category = state.config.categories.find(cat => cat.id === params.categoryId && cat.isActive);
  if (!category) return { success: false, state: originalState, error: 'Categoria inexistente ou inativa.' };

  const tronco = state.users.find(user => user.id === params.troncoUserId && user.status === 'active');
  if (!tronco) return { success: false, state: originalState, error: 'Usuário do tronco inexistente ou inativo.' };
  if (tronco.role === 'admin') return { success: false, state: originalState, error: 'Admin técnico não pode ocupar tronco de árvore de jogo.' };

  // Regra administrativa: o mesmo participante pode ocupar uma posição em várias árvores.
  // O bloqueio global por qualquer árvore ativa impedia a criação de novas árvores com troncos válidos.

  const nextTreeId = nextId(state.trees);
  const nextCycle = Math.max(0, ...state.trees.map(tree => tree.cycleNumber || 0)) + 1;
  const treeCode = `ARB-TREE-${String(category.tokenRequirement).padStart(2, '0')}-${String(nextTreeId).padStart(3, '0')}`;

  const tree: Tree = {
    id: nextTreeId,
    categoryId: category.id,
    treeCode,
    nickname: null,
    troncoUserId: tronco.id,
    status: 'active',
    cycleNumber: nextCycle,
    parentTreeId: null,
    positions: createEmptyPositions(tronco, now),
    createdAt: now,
    completedAt: null
  };
  state.trees.push(tree);

  tronco.currentTreeId = tree.id;
  tronco.currentPositionIndex = 0;
  tronco.updatedAt = now;

  const referral: Referral = {
    id: nextId(state.referrals),
    referrerUserId: tronco.id,
    referredUserId: null,
    treeId: tree.id,
    token: `ref_${tree.treeCode.toLowerCase()}_${Math.random().toString(36).slice(2, 10)}`,
    clicks: 0,
    registrationsCount: 0,
    isActive: true,
    createdAt: now
  };
  state.referrals.push(referral);

  appendAudit(state, params.actor, 'ADMIN_TREE_CREATED', 'tree', tree.id, {
    idempotencyKey: params.idempotencyKey,
    categoryId: category.id,
    troncoUserId: tronco.id,
    treeCode: tree.treeCode,
    githubActor: params.actor.githubActor || null
  });

  return { success: true, state, result: { tree, referral } };
}

export function archiveTreeByAdmin(
  originalState: GameDatabaseState,
  params: {
    treeId: number;
    reason?: string;
    actor: AdminActor;
    idempotencyKey: string;
  }
): AdminActionResult<{ treeId: number }> {
  const state = deepClone(originalState);
  const now = nowIso();

  const adminError = assertAdmin(state, params.actor);
  if (adminError) return { success: false, state: originalState, error: adminError };
  if (hasConsumedIdempotencyKey(state, params.idempotencyKey)) {
    return { success: false, state: originalState, error: 'Operação administrativa já processada.' };
  }

  const tree = state.trees.find(item => item.id === params.treeId);
  if (!tree) return { success: false, state: originalState, error: 'Árvore não encontrada.' };
  if (tree.status !== 'active') return { success: false, state: originalState, error: 'Somente árvore ativa pode ser arquivada.' };

  tree.status = 'archived';
  tree.completedAt = tree.completedAt || now;

  for (const ref of state.referrals) {
    if (ref.treeId === tree.id) ref.isActive = false;
  }

  const affectedUserIds = new Set(tree.positions.filter(pos => pos.userId).map(pos => pos.userId as number));
  for (const user of state.users) {
    if (affectedUserIds.has(user.id) && user.currentTreeId === tree.id) {
      user.currentTreeId = null;
      user.currentPositionIndex = null;
      user.updatedAt = now;
    }
  }

  appendAudit(state, params.actor, 'ADMIN_TREE_ARCHIVED', 'tree', tree.id, {
    idempotencyKey: params.idempotencyKey,
    reason: params.reason || 'Arquivamento administrativo',
    affectedUserIds: Array.from(affectedUserIds),
    githubActor: params.actor.githubActor || null
  });

  return { success: true, state, result: { treeId: tree.id } };
}

export function deleteTreeByAdmin(
  originalState: GameDatabaseState,
  params: {
    treeId: number;
    actor: AdminActor;
    idempotencyKey: string;
  }
): AdminActionResult<{ treeId: number; affectedUserIds: number[]; nextTreeId: number | null }> {
  const state = deepClone(originalState);
  const now = nowIso();

  const adminError = assertAdmin(state, params.actor);
  if (adminError) return { success: false, state: originalState, error: adminError };
  if (hasConsumedIdempotencyKey(state, params.idempotencyKey)) {
    return { success: false, state: originalState, error: 'Operação administrativa já processada.' };
  }

  const tree = state.trees.find(item => item.id === params.treeId);
  if (!tree) return { success: false, state: originalState, error: 'Árvore não encontrada.' };

  const affectedUserIds = Array.from(new Set(tree.positions.filter(pos => pos.userId).map(pos => pos.userId as number)));
  for (const user of state.users) {
    if (affectedUserIds.includes(user.id) && user.currentTreeId === tree.id) {
      user.currentTreeId = null;
      user.currentPositionIndex = null;
      user.updatedAt = now;
    }
  }

  state.referrals = state.referrals.filter(ref => ref.treeId !== tree.id);
  state.ledger = state.ledger.filter(entry => entry.treeId !== tree.id);
  state.trees = state.trees.filter(item => item.id !== tree.id);
  const nextTreeId = state.trees[0]?.id ?? null;

  appendAudit(state, params.actor, 'ADMIN_TREE_DELETED', 'tree', tree.id, {
    idempotencyKey: params.idempotencyKey,
    treeCode: tree.treeCode,
    affectedUserIds,
    deletedAt: now,
    githubActor: params.actor.githubActor || null
  });

  return { success: true, state, result: { treeId: tree.id, affectedUserIds, nextTreeId } };
}

export function deleteUserByAdmin(
  originalState: GameDatabaseState,
  params: {
    userId: number;
    actor: AdminActor;
    idempotencyKey: string;
  }
): AdminActionResult<{ userId: number; username: string; affectedTreeIds: number[] }> {
  const state = deepClone(originalState);
  const now = nowIso();

  const adminError = assertAdmin(state, params.actor);
  if (adminError) return { success: false, state: originalState, error: adminError };
  if (hasConsumedIdempotencyKey(state, params.idempotencyKey)) {
    return { success: false, state: originalState, error: 'Operação administrativa já processada.' };
  }

  const target = state.users.find(user => user.id === params.userId);
  if (!target) return { success: false, state: originalState, error: 'Usuário não encontrado.' };
  if (target.role === 'admin') return { success: false, state: originalState, error: 'Coordenador/admin não pode ser excluído por este painel.' };

  const trunkTrees = state.trees.filter(tree => tree.troncoUserId === target.id);
  if (trunkTrees.length > 0) {
    return { success: false, state: originalState, error: 'Este usuário é tronco de árvore. Exclua a árvore antes de excluir o membro.' };
  }

  const affectedTreeIds: number[] = [];
  for (const tree of state.trees) {
    let touched = false;
    for (const position of tree.positions) {
      if (position.userId === target.id) {
        position.userId = null;
        position.status = 'vacant';
        position.occupiedAt = null;
        position.username = null;
        position.name = null;
        touched = true;
      }
    }
    if (touched) affectedTreeIds.push(tree.id);
  }

  state.referrals = state.referrals.filter(ref => ref.referrerUserId !== target.id && ref.referredUserId !== target.id);
  state.ledger = state.ledger.filter(entry => entry.fromUserId !== target.id && entry.toUserId !== target.id);
  state.wallets = state.wallets.filter(wallet => wallet.userId !== target.id);
  state.users = state.users.filter(user => user.id !== target.id);

  appendAudit(state, params.actor, 'ADMIN_USER_DELETED', 'user', target.id, {
    idempotencyKey: params.idempotencyKey,
    username: target.username,
    name: target.name,
    affectedTreeIds,
    deletedAt: now,
    githubActor: params.actor.githubActor || null
  });

  return { success: true, state, result: { userId: target.id, username: target.username, affectedTreeIds } };
}


export function updateTreeNicknameByAdmin(
  originalState: GameDatabaseState,
  params: {
    treeId: number;
    nickname?: string;
    actor: AdminActor;
    idempotencyKey: string;
  }
): AdminActionResult<{ treeId: number; nickname: string | null }> {
  const state = deepClone(originalState);
  const now = nowIso();

  const adminError = assertAdmin(state, params.actor);
  if (adminError) return { success: false, state: originalState, error: adminError };
  if (hasConsumedIdempotencyKey(state, params.idempotencyKey)) {
    return { success: false, state: originalState, error: 'Operação administrativa já processada.' };
  }

  const tree = state.trees.find(item => item.id === params.treeId);
  if (!tree) return { success: false, state: originalState, error: 'Árvore não encontrada.' };

  const nickname = params.nickname?.trim().slice(0, 120) || null;
  tree.nickname = nickname;

  appendAudit(state, params.actor, 'ADMIN_TREE_NICKNAME_UPDATED', 'tree', tree.id, {
    idempotencyKey: params.idempotencyKey,
    nickname,
    updatedAt: now,
    githubActor: params.actor.githubActor || null
  });

  return { success: true, state, result: { treeId: tree.id, nickname } };
}

export function assignTreePositionByAdmin(
  originalState: GameDatabaseState,
  params: {
    treeId: number;
    positionIndex: number;
    userId: number;
    actor: AdminActor;
    idempotencyKey: string;
  }
): AdminActionResult<{ treeId: number; positionIndex: number; userId: number }> {
  const state = deepClone(originalState);
  const now = nowIso();

  const adminError = assertAdmin(state, params.actor);
  if (adminError) return { success: false, state: originalState, error: adminError };
  if (hasConsumedIdempotencyKey(state, params.idempotencyKey)) {
    return { success: false, state: originalState, error: 'Operação administrativa já processada.' };
  }

  const tree = state.trees.find(item => item.id === params.treeId && item.status === 'active');
  if (!tree) return { success: false, state: originalState, error: 'Árvore ativa não encontrada.' };

  const targetPosition = tree.positions.find(pos => pos.index === params.positionIndex);
  if (!targetPosition) return { success: false, state: originalState, error: 'Posição inexistente na árvore.' };
  if (targetPosition.status === 'occupied' && targetPosition.userId !== params.userId) {
    return { success: false, state: originalState, error: 'Posição já está ocupada por outro usuário.' };
  }

  const user = state.users.find(item => item.id === params.userId && item.status === 'active');
  if (!user) return { success: false, state: originalState, error: 'Usuário inexistente ou inativo.' };
  if (user.role === 'admin') return { success: false, state: originalState, error: 'Admin técnico não pode ocupar posição de jogo.' };

  // Regra administrativa: impedir apenas duplicidade dentro da mesma árvore.
  // Participar de outra árvore ativa não bloqueia atribuição nesta árvore.

  const currentPosition = tree.positions.find(pos => pos.userId === user.id && pos.status === 'occupied');
  if (currentPosition?.index === 0 && targetPosition.index !== 0) {
    return { success: false, state: originalState, error: 'Não mova o tronco para outra posição. Primeiro defina outro usuário na posição #0.' };
  }

  if (currentPosition && currentPosition.index !== targetPosition.index) {
    currentPosition.userId = null;
    currentPosition.status = 'vacant';
    currentPosition.occupiedAt = null;
    currentPosition.username = null;
    currentPosition.name = null;
  }

  targetPosition.userId = user.id;
  targetPosition.status = 'occupied';
  targetPosition.occupiedAt = now;
  targetPosition.username = user.username;
  targetPosition.name = user.name;

  if (targetPosition.index === 0) {
    tree.troncoUserId = user.id;
  }

  user.currentTreeId = tree.id;
  user.currentPositionIndex = targetPosition.index;
  user.updatedAt = now;

  appendAudit(state, params.actor, 'ADMIN_TREE_POSITION_ASSIGNED', 'tree_position', `${tree.id}_${targetPosition.index}`, {
    idempotencyKey: params.idempotencyKey,
    treeId: tree.id,
    positionIndex: targetPosition.index,
    userId: user.id,
    previousPositionIndex: currentPosition?.index ?? null,
    githubActor: params.actor.githubActor || null
  });

  return { success: true, state, result: { treeId: tree.id, positionIndex: targetPosition.index, userId: user.id } };
}

export function clearTreePositionByAdmin(
  originalState: GameDatabaseState,
  params: {
    treeId: number;
    positionIndex: number;
    actor: AdminActor;
    idempotencyKey: string;
  }
): AdminActionResult<{ treeId: number; positionIndex: number; removedUserId: number | null }> {
  const state = deepClone(originalState);
  const now = nowIso();

  const adminError = assertAdmin(state, params.actor);
  if (adminError) return { success: false, state: originalState, error: adminError };
  if (hasConsumedIdempotencyKey(state, params.idempotencyKey)) {
    return { success: false, state: originalState, error: 'Operação administrativa já processada.' };
  }

  const tree = state.trees.find(item => item.id === params.treeId && item.status === 'active');
  if (!tree) return { success: false, state: originalState, error: 'Árvore ativa não encontrada.' };
  if (params.positionIndex === 0) {
    return { success: false, state: originalState, error: 'A posição #0 do tronco não pode ficar vazia. Substitua o tronco por atribuição administrativa.' };
  }

  const position = tree.positions.find(pos => pos.index === params.positionIndex);
  if (!position) return { success: false, state: originalState, error: 'Posição inexistente na árvore.' };

  const removedUserId = position.userId;
  if (removedUserId) {
    const user = state.users.find(item => item.id === removedUserId);
    if (user && user.currentTreeId === tree.id && user.currentPositionIndex === position.index) {
      user.currentTreeId = null;
      user.currentPositionIndex = null;
      user.updatedAt = now;
    }
  }

  position.userId = null;
  position.status = 'vacant';
  position.occupiedAt = null;
  position.username = null;
  position.name = null;

  appendAudit(state, params.actor, 'ADMIN_TREE_POSITION_CLEARED', 'tree_position', `${tree.id}_${position.index}`, {
    idempotencyKey: params.idempotencyKey,
    treeId: tree.id,
    positionIndex: position.index,
    removedUserId,
    githubActor: params.actor.githubActor || null
  });

  return { success: true, state, result: { treeId: tree.id, positionIndex: position.index, removedUserId } };
}
