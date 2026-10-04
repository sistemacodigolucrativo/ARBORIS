import {
  GameDatabaseState,
  User,
  Wallet,
  Tree,
  TreePosition,
  Referral,
  LedgerEntry,
  AuditLogEntry,
  PositionSide
} from '../types/game';

export interface ActionResult<T = any> {
  success: boolean;
  state: GameDatabaseState;
  result?: T;
  error?: string;
}

// 1-2-4-8 Deterministic topology
export const TOPOLOGY: Array<{ index: number; level: number; side: PositionSide }> = [
  { index: 0, level: 0, side: 'root' },
  { index: 1, level: 1, side: 'left' },
  { index: 2, level: 1, side: 'right' },
  { index: 3, level: 2, side: 'left' },
  { index: 4, level: 2, side: 'right' },
  { index: 5, level: 2, side: 'left' },
  { index: 6, level: 2, side: 'right' },
  { index: 7, level: 3, side: 'left' },
  { index: 8, level: 3, side: 'left' },
  { index: 9, level: 3, side: 'left' },
  { index: 10, level: 3, side: 'left' },
  { index: 11, level: 3, side: 'right' },
  { index: 12, level: 3, side: 'right' },
  { index: 13, level: 3, side: 'right' },
  { index: 14, level: 3, side: 'right' }
];

export const LEFT_SPLIT_MAP: Record<number, number> = {
  0: 1,
  1: 3,
  2: 4,
  3: 7,
  4: 8,
  5: 9,
  6: 10
};

export const RIGHT_SPLIT_MAP: Record<number, number> = {
  0: 2,
  1: 5,
  2: 6,
  3: 11,
  4: 12,
  5: 13,
  6: 14
};

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Validates whether an idempotency key has already been consumed in the ledger.
 */
export function validateIdempotency(state: GameDatabaseState, idempotencyKey?: string): boolean {
  if (!idempotencyKey) return true;
  return !state.ledger.some(l => l.idempotencyKey === idempotencyKey);
}

/**
 * Validates a referral token or tree indicator username.
 */
export function validateReferral(
  state: GameDatabaseState,
  tokenOrUsername: string
): { valid: boolean; tree?: Tree; referrer?: User; referral?: Referral; error?: string } {
  const query = tokenOrUsername.trim();
  if (!query) {
    return { valid: false, error: 'Identificador do indicador ou token é obrigatório.' };
  }

  // 1. By Token
  const referral = state.referrals.find(r => r.token === query && r.isActive);
  if (referral) {
    const tree = state.trees.find(t => t.id === referral.treeId && t.status === 'active');
    const referrer = state.users.find(u => u.id === referral.referrerUserId && u.status === 'active');
    if (!tree) return { valid: false, error: 'Árvore deste link já concluiu seu ciclo ou está inativa.' };
    return { valid: true, tree, referrer, referral };
  }

  // 2. By Username (represents the tree's Tronco or member)
  const user = state.users.find(u => u.username.toLowerCase() === query.toLowerCase() && u.status === 'active');
  if (user) {
    let tree: Tree | undefined;
    if (user.currentTreeId) {
      tree = state.trees.find(t => t.id === user.currentTreeId && t.status === 'active');
    }
    if (!tree) {
      tree = state.trees.find(t => t.troncoUserId === user.id && t.status === 'active');
    }
    if (!tree) {
      tree = state.trees.find(t => t.status === 'active');
    }
    if (!tree) return { valid: false, error: 'Não há árvore ativa vinculada a este usuário.' };

    const ref = state.referrals.find(r => r.treeId === tree!.id && r.isActive);
    return { valid: true, tree, referrer: user, referral: ref };
  }

  return { valid: false, error: 'Indicador ou link não encontrado no sistema.' };
}

/**
 * Recalculates wallet balance from ledger history (Single Source of Truth).
 */
export function recalculateWallet(state: GameDatabaseState, userId: number): number {
  let calculated = 0;
  for (const entry of state.ledger) {
    if (entry.toUserId === userId) {
      calculated += entry.amount;
    }
    if (entry.fromUserId === userId) {
      calculated -= entry.amount;
    }
  }
  return calculated;
}

/**
 * Creates and registers a new participant, granting initial virtual seeds.
 */
export function createParticipant(
  originalState: GameDatabaseState,
  params: {
    username: string;
    name: string;
    indicadorUsername: string;
    githubActor?: string | null;
    idempotencyKey?: string;
  }
): ActionResult<{ user: User; tokensGranted: number; treeId: number }> {
  const state = deepClone(originalState);
  const now = nowIso();

  const idKey = params.idempotencyKey || `register_${params.username.trim().toLowerCase()}_${Date.now()}`;
  if (!validateIdempotency(state, idKey)) {
    return { success: false, state: originalState, error: 'Operação de cadastro já processada (chave duplicada).' };
  }

  const cleanUsername = params.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, state: originalState, error: 'Nome de usuário inválido (mínimo 3 caracteres alfanuméricos).' };
  }

  if (state.users.some(u => u.username.toLowerCase() === cleanUsername)) {
    return { success: false, state: originalState, error: `O nome de usuário "${cleanUsername}" já está em uso.` };
  }

  const refCheck = validateReferral(state, params.indicadorUsername);
  if (!refCheck.valid || !refCheck.tree) {
    return { success: false, state: originalState, error: refCheck.error || 'Indicador inválido.' };
  }

  const targetTree = refCheck.tree;
  const initialGrant = state.config.initialSeedsGrant || 25;

  // New User
  const nextUserId = Math.max(0, ...state.users.map(u => u.id)) + 1;
  const newUser: User = {
    id: nextUserId,
    username: cleanUsername,
    name: params.name.trim(),
    githubActor: params.githubActor || null,
    role: 'participant',
    status: 'active',
    currentTreeId: targetTree.id,
    currentPositionIndex: null, // Outside tree until strengthening button is clicked
    createdAt: now,
    updatedAt: now
  };
  state.users.push(newUser);

  // New Wallet
  const newWallet: Wallet = {
    userId: nextUserId,
    balance: initialGrant,
    updatedAt: now
  };
  state.wallets.push(newWallet);

  // Ledger record for initial grant
  const nextLedgerId = Math.max(0, ...state.ledger.map(l => l.id)) + 1;
  const grantLedger: LedgerEntry = {
    id: nextLedgerId,
    type: 'CONCESSAO_INICIAL_SEMENTES',
    fromUserId: null,
    toUserId: nextUserId,
    treeId: targetTree.id,
    amount: initialGrant,
    reason: `Concessão inicial de boas-vindas: ${initialGrant} sementes virtuais recreativas`,
    idempotencyKey: idKey,
    fromUsername: 'sistema',
    toUsername: cleanUsername,
    createdAt: now
  };
  state.ledger.push(grantLedger);

  // Audit Log
  const nextAuditId = Math.max(0, ...state.auditLog.map(a => a.id)) + 1;
  const audit: AuditLogEntry = {
    id: nextAuditId,
    actorUserId: nextUserId,
    action: 'PARTICIPANT_REGISTERED',
    entity: 'user',
    entityId: nextUserId,
    metadata: {
      username: cleanUsername,
      githubActor: params.githubActor || null,
      indicador: params.indicadorUsername,
      treeId: targetTree.id,
      initialSeeds: initialGrant
    },
    actorUsername: cleanUsername,
    createdAt: now
  };
  state.auditLog.push(audit);

  return {
    success: true,
    state,
    result: {
      user: newUser,
      tokensGranted: initialGrant,
      treeId: targetTree.id
    }
  };
}

/**
 * Transfers seeds between participants (or to tronco).
 */
export function transferSeeds(
  originalState: GameDatabaseState,
  params: {
    fromUserId: number;
    toUserId: number;
    treeId: number;
    amount: number;
    reason: string;
    idempotencyKey: string;
  }
): ActionResult<LedgerEntry> {
  const state = deepClone(originalState);
  const now = nowIso();

  if (!validateIdempotency(state, params.idempotencyKey)) {
    return { success: false, state: originalState, error: 'Transferência já processada anteriormente (idempotencyKey repetida).' };
  }

  if (params.amount <= 0) {
    return { success: false, state: originalState, error: 'A quantidade de sementes deve ser estritamente positiva.' };
  }

  const fromWallet = state.wallets.find(w => w.userId === params.fromUserId);
  if (!fromWallet || fromWallet.balance < params.amount) {
    return { success: false, state: originalState, error: 'Saldo de sementes virtuais insuficiente.' };
  }

  const toWallet = state.wallets.find(w => w.userId === params.toUserId);
  if (!toWallet) {
    return { success: false, state: originalState, error: 'Carteira do destinatário não encontrada.' };
  }

  // Update balances
  fromWallet.balance -= params.amount;
  fromWallet.updatedAt = now;

  toWallet.balance += params.amount;
  toWallet.updatedAt = now;

  const fromUser = state.users.find(u => u.id === params.fromUserId);
  const toUser = state.users.find(u => u.id === params.toUserId);

  // Record ledger entry
  const nextLedgerId = Math.max(0, ...state.ledger.map(l => l.id)) + 1;
  const ledgerRecord: LedgerEntry = {
    id: nextLedgerId,
    type: 'FORTALECIMENTO_TRONCO',
    fromUserId: params.fromUserId,
    toUserId: params.toUserId,
    treeId: params.treeId,
    amount: params.amount,
    reason: params.reason,
    idempotencyKey: params.idempotencyKey,
    fromUsername: fromUser?.username || `user_${params.fromUserId}`,
    toUsername: toUser?.username || `user_${params.toUserId}`,
    createdAt: now
  };
  state.ledger.push(ledgerRecord);

  return { success: true, state, result: ledgerRecord };
}

/**
 * Finds the next vacant external position in the tree (indexes 7 to 14).
 */
export function findNextVacantPosition(tree: Tree): TreePosition | null {
  for (let i = 7; i <= 14; i++) {
    const pos = tree.positions.find(p => p.index === i);
    if (pos && pos.status === 'vacant') {
      return pos;
    }
  }
  return null;
}

/**
 * Strengthens the Tronco (atomic operation):
 * 1. Validates user & tree
 * 2. Determines requirement strictly from category config (not from client!)
 * 3. Validates balance
 * 4. Finds next vacant external position (7..14)
 * 5. Executes transfer from participant to Tronco
 * 6. Occupies position
 * 7. Checks if tree reached 15/15
 * 8. If 15/15, triggers deterministic 1-2-4-8 bifurcation into exactly 2 child trees.
 */
export function strengthenTronco(
  originalState: GameDatabaseState,
  params: {
    userId: number;
    treeId: number;
    idempotencyKey?: string;
  }
): ActionResult<{ positionIndex: number; bifurcated: boolean; newTrees?: Tree[] }> {
  const state = deepClone(originalState);
  const now = nowIso();

  const user = state.users.find(u => u.id === params.userId && u.status === 'active');
  if (!user) {
    return { success: false, state: originalState, error: 'Participante não encontrado ou inativo.' };
  }

  const tree = state.trees.find(t => t.id === params.treeId && t.status === 'active');
  if (!tree) {
    return { success: false, state: originalState, error: 'Árvore comunitária não encontrada ou já concluída.' };
  }

  // Already in this tree?
  const alreadyInTree = tree.positions.some(p => p.userId === user.id && p.status === 'occupied');
  if (alreadyInTree) {
    return { success: false, state: originalState, error: 'Você já ocupa uma posição ativa nesta árvore comunitária.' };
  }

  // Strict backend amount resolution from category (CRÍTICO 1)
  const category = state.config.categories.find(c => c.id === tree.categoryId);
  if (!category || !category.tokenRequirement || category.tokenRequirement <= 0) {
    return { success: false, state: originalState, error: 'Configuração da categoria inválida ou corrompida. Operação abortada.' };
  }
  const requiredAmount = category.tokenRequirement;

  // Find next vacant external position (CRÍTICO 2)
  const vacantPos = findNextVacantPosition(tree);
  if (!vacantPos) {
    return { success: false, state: originalState, error: 'Esta árvore comunitária já está com todas as vagas externas preenchidas.' };
  }

  // Validate balance
  const wallet = state.wallets.find(w => w.userId === user.id);
  if (!wallet || wallet.balance < requiredAmount) {
    return {
      success: false,
      state: originalState,
      error: `Saldo insuficiente. Necessário: ${requiredAmount} sementes, Saldo atual: ${wallet?.balance || 0}`
    };
  }

  const idempotencyKey = params.idempotencyKey || `strengthen_${user.id}_tree${tree.id}_pos${vacantPos.index}_${Date.now()}`;
  if (!validateIdempotency(state, idempotencyKey)) {
    return { success: false, state: originalState, error: 'Operação já realizada (chave idempotente duplicada).' };
  }

  // Step 1: Transfer from entrant to Tronco
  const fromWallet = state.wallets.find(w => w.userId === user.id);
  if (!fromWallet || fromWallet.balance < requiredAmount) {
    return { success: false, state: originalState, error: 'Saldo de sementes virtuais insuficiente.' };
  }

  const toWallet = state.wallets.find(w => w.userId === tree.troncoUserId);
  if (!toWallet) {
    return { success: false, state: originalState, error: 'Carteira do Tronco não encontrada.' };
  }

  fromWallet.balance -= requiredAmount;
  fromWallet.updatedAt = now;

  toWallet.balance += requiredAmount;
  toWallet.updatedAt = now;

  const troncoUser = state.users.find(u => u.id === tree.troncoUserId);

  const nextLedgerId = Math.max(0, ...state.ledger.map(l => l.id)) + 1;
  state.ledger.push({
    id: nextLedgerId,
    type: 'FORTALECIMENTO_TRONCO',
    fromUserId: user.id,
    toUserId: tree.troncoUserId,
    treeId: tree.id,
    amount: requiredAmount,
    reason: `Fortalecimento do Tronco: ocupação da posição #${vacantPos.index} na Árvore ${tree.treeCode}`,
    idempotencyKey,
    fromUsername: user.username,
    toUsername: troncoUser?.username || `user_${tree.troncoUserId}`,
    createdAt: now
  });

  // Step 2: Occupy the position
  const targetPos = tree.positions.find(p => p.index === vacantPos.index)!;
  targetPos.status = 'occupied';
  targetPos.userId = user.id;
  targetPos.username = user.username;
  targetPos.name = user.name;
  targetPos.occupiedAt = now;

  // Update user's current tree and position
  user.currentTreeId = tree.id;
  user.currentPositionIndex = targetPos.index;
  user.updatedAt = now;

  // Step 3: Record Audit Log
  const nextAuditId = Math.max(0, ...state.auditLog.map(a => a.id)) + 1;
  state.auditLog.push({
    id: nextAuditId,
    actorUserId: user.id,
    action: 'TREE_POSITION_OCCUPIED',
    entity: 'tree_position',
    entityId: `${tree.id}_${targetPos.index}`,
    metadata: {
      userId: user.id,
      treeId: tree.id,
      positionIndex: targetPos.index,
      amount: requiredAmount
    },
    actorUsername: user.username,
    createdAt: now
  });

  // Step 4: Check if tree is complete (all 15 positions occupied)
  const occupiedCount = tree.positions.filter(p => p.status === 'occupied').length;
  let bifurcated = false;
  let newTrees: Tree[] = [];

  if (occupiedCount === 15) {
    // 15/15: Complete cycle and split tree into 2 daughter trees
    const splitRes = splitTreeIfComplete(state, tree.id);
    if (splitRes.success) {
      bifurcated = true;
      newTrees = splitRes.result?.newTrees || [];
      return {
        success: true,
        state: splitRes.state,
        result: {
          positionIndex: targetPos.index,
          bifurcated,
          newTrees
        }
      };
    }
  }

  return {
    success: true,
    state,
    result: {
      positionIndex: targetPos.index,
      bifurcated,
      newTrees
    }
  };
}

/**
 * Splits a completed mother tree into exactly two child trees using the 1-2-4-8 deterministic rule.
 */
export function splitTreeIfComplete(
  originalState: GameDatabaseState,
  treeId: number
): ActionResult<{ newTrees: Tree[] }> {
  const state = deepClone(originalState);
  const now = nowIso();

  const mother = state.trees.find(t => t.id === treeId && t.status === 'active');
  if (!mother) {
    return { success: false, state: originalState, error: 'Árvore mãe não encontrada ou inativa.' };
  }

  const occupiedCount = mother.positions.filter(p => p.status === 'occupied').length;
  if (occupiedCount < 15) {
    return { success: false, state: originalState, error: `Árvore incompleta (${occupiedCount}/15). Não é possível bifurcar.` };
  }

  // Complete mother tree
  mother.status = 'completed';
  mother.completedAt = now;

  // Old Tronco desocupa o tabuleiro
  const oldTronco = state.users.find(u => u.id === mother.troncoUserId);
  if (oldTronco) {
    oldTronco.currentTreeId = null;
    oldTronco.currentPositionIndex = null;
    oldTronco.updatedAt = now;
  }

  // Deactivate mother tree referral links
  for (const ref of state.referrals) {
    if (ref.treeId === mother.id) {
      ref.isActive = false;
    }
  }

  const baseTreeId = Math.max(0, ...state.trees.map(t => t.id));
  const leftChildId = baseTreeId + 1;
  const rightChildId = baseTreeId + 2;

  // Helper to build 15 positions from split map
  function createPositionsFromMap(newTreeId: number, splitMap: Record<number, number>): TreePosition[] {
    const positions: TreePosition[] = [];
    for (const topo of TOPOLOGY) {
      const oldIndex = splitMap[topo.index];
      if (oldIndex !== undefined) {
        const oldPos = mother!.positions.find(p => p.index === oldIndex);
        if (oldPos && oldPos.userId) {
          positions.push({
            index: topo.index,
            level: topo.level,
            side: topo.side,
            userId: oldPos.userId,
            status: 'occupied',
            occupiedAt: now,
            username: oldPos.username,
            name: oldPos.name
          });
          continue;
        }
      }
      // Vacant position
      positions.push({
        index: topo.index,
        level: topo.level,
        side: topo.side,
        userId: null,
        status: 'vacant',
        occupiedAt: null,
        username: null,
        name: null
      });
    }
    return positions;
  }

  const leftPositions = createPositionsFromMap(leftChildId, LEFT_SPLIT_MAP);
  const rightPositions = createPositionsFromMap(rightChildId, RIGHT_SPLIT_MAP);

  const leftTroncoUid = leftPositions[0].userId!;
  const rightTroncoUid = rightPositions[0].userId!;

  const leftTree: Tree = {
    id: leftChildId,
    categoryId: mother.categoryId,
    treeCode: `${mother.treeCode}-L`,
    troncoUserId: leftTroncoUid,
    status: 'active',
    cycleNumber: mother.cycleNumber + 1,
    parentTreeId: mother.id,
    positions: leftPositions,
    createdAt: now,
    completedAt: null
  };

  const rightTree: Tree = {
    id: rightChildId,
    categoryId: mother.categoryId,
    treeCode: `${mother.treeCode}-R`,
    troncoUserId: rightTroncoUid,
    status: 'active',
    cycleNumber: mother.cycleNumber + 1,
    parentTreeId: mother.id,
    positions: rightPositions,
    createdAt: now,
    completedAt: null
  };

  state.trees.push(leftTree, rightTree);

  // Update user locations for members in left tree
  for (const pos of leftPositions) {
    if (pos.userId) {
      const u = state.users.find(usr => usr.id === pos.userId);
      if (u) {
        u.currentTreeId = leftChildId;
        u.currentPositionIndex = pos.index;
        u.updatedAt = now;
      }
    }
  }

  // Update user locations for members in right tree
  for (const pos of rightPositions) {
    if (pos.userId) {
      const u = state.users.find(usr => usr.id === pos.userId);
      if (u) {
        u.currentTreeId = rightChildId;
        u.currentPositionIndex = pos.index;
        u.updatedAt = now;
      }
    }
  }

  // Create dedicated referral links for new Troncos
  const baseRefId = Math.max(0, ...state.referrals.map(r => r.id));
  const leftToken = `ref_${leftTree.treeCode.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`;
  const rightToken = `ref_${rightTree.treeCode.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`;

  state.referrals.push(
    {
      id: baseRefId + 1,
      referrerUserId: leftTroncoUid,
      referredUserId: null,
      treeId: leftChildId,
      token: leftToken,
      clicks: 0,
      registrationsCount: 0,
      isActive: true,
      createdAt: now
    },
    {
      id: baseRefId + 2,
      referrerUserId: rightTroncoUid,
      referredUserId: null,
      treeId: rightChildId,
      token: rightToken,
      clicks: 0,
      registrationsCount: 0,
      isActive: true,
      createdAt: now
    }
  );

  // Audit Log
  const nextAuditId = Math.max(0, ...state.auditLog.map(a => a.id)) + 1;
  state.auditLog.push({
    id: nextAuditId,
    actorUserId: 1, // System / Admin
    action: 'TREE_BIFURCATION_1_2_4_8',
    entity: 'tree',
    entityId: mother.id,
    metadata: {
      motherTreeId: mother.id,
      leftChildId,
      rightChildId,
      leftTroncoUid,
      rightTroncoUid
    },
    actorUsername: 'sistema',
    createdAt: now
  });

  return {
    success: true,
    state,
    result: {
      newTrees: [leftTree, rightTree]
    }
  };
}
