import { GameDatabaseState, Referral, User } from '../types/game';
import { createParticipant } from './gameEngine';
import {
  archiveTreeByAdmin,
  assignTreePositionByAdmin,
  clearTreePositionByAdmin,
  createTreeByAdmin
} from './adminGameEngine';
import { commitMultipleJsonFiles, getJsonFile, GitHubJsonWriterError, JsonWriteFile } from './githubJsonWriter';
import { writeQueue } from './writeQueue';

type StateFileKey = 'users' | 'wallets' | 'trees' | 'referrals' | 'ledger' | 'auditLog';

type ActorParams = {
  actorUserId?: number;
  actorUsername?: string;
};

export type DirectAdminActionResult<T = unknown> = {
  success: boolean;
  state?: GameDatabaseState;
  result?: T;
  error?: string;
  conflict?: boolean;
};

const STATE_FILE_MAP: Record<StateFileKey, { dataPath: string; publicPath: string; stateKey: keyof GameDatabaseState }> = {
  users: { dataPath: 'data/users.json', publicPath: 'public/data/users.json', stateKey: 'users' },
  wallets: { dataPath: 'data/wallets.json', publicPath: 'public/data/wallets.json', stateKey: 'wallets' },
  trees: { dataPath: 'data/trees.json', publicPath: 'public/data/trees.json', stateKey: 'trees' },
  referrals: { dataPath: 'data/referrals.json', publicPath: 'public/data/referrals.json', stateKey: 'referrals' },
  ledger: { dataPath: 'data/ledger.json', publicPath: 'public/data/ledger.json', stateKey: 'ledger' },
  auditLog: { dataPath: 'data/audit-log.json', publicPath: 'public/data/audit-log.json', stateKey: 'auditLog' }
};

function createIdempotencyKey(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${random}`;
}

function nextId(items: Array<{ id: number }>): number {
  return Math.max(0, ...items.map(item => item.id)) + 1;
}

function normalizeError(error: any): { error: string; conflict?: boolean } {
  if (error instanceof GitHubJsonWriterError) {
    return {
      error: error.message,
      conflict: error.status === 409 || error.code === 'CONFLICT'
    };
  }
  return { error: error?.message || 'Falha desconhecida ao gravar JSON remoto.' };
}

function resolveAdminActor(state: GameDatabaseState, actor: ActorParams) {
  const byId = actor.actorUserId
    ? state.users.find(user => user.id === actor.actorUserId && user.role === 'admin' && user.status === 'active')
    : null;
  const fallback = state.users.find(user => user.role === 'admin' && user.status === 'active');
  const admin = byId || fallback;
  if (!admin) throw new Error('Ação administrativa rejeitada: nenhum admin ativo encontrado.');
  return {
    actorUserId: admin.id,
    actorUsername: actor.actorUsername || admin.username,
    githubActor: admin.githubActor || null
  };
}

async function loadRemoteGameState(): Promise<GameDatabaseState> {
  const [config, users, wallets, trees, referrals, ledger, auditLog] = await Promise.all([
    getJsonFile<GameDatabaseState['config']>('data/config.json'),
    getJsonFile<GameDatabaseState['users']>('data/users.json'),
    getJsonFile<GameDatabaseState['wallets']>('data/wallets.json'),
    getJsonFile<GameDatabaseState['trees']>('data/trees.json'),
    getJsonFile<GameDatabaseState['referrals']>('data/referrals.json'),
    getJsonFile<GameDatabaseState['ledger']>('data/ledger.json'),
    getJsonFile<GameDatabaseState['auditLog']>('data/audit-log.json')
  ]);

  if (!config.exists || !users.exists || !wallets.exists || !trees.exists || !referrals.exists || !ledger.exists || !auditLog.exists) {
    throw new Error('Um ou mais JSONs obrigatórios não foram encontrados em data/.');
  }

  return {
    config: config.json!,
    users: users.json!,
    wallets: wallets.json!,
    trees: trees.json!,
    referrals: referrals.json!,
    ledger: ledger.json!,
    auditLog: auditLog.json!
  };
}

function buildStateFiles(state: GameDatabaseState, keys: StateFileKey[]): JsonWriteFile[] {
  const files: JsonWriteFile[] = [];
  for (const key of keys) {
    const descriptor = STATE_FILE_MAP[key];
    const json = state[descriptor.stateKey];
    files.push({ path: descriptor.dataPath, json });
    files.push({ path: descriptor.publicPath, json });
  }
  return files;
}

async function commitStateFiles(state: GameDatabaseState, keys: StateFileKey[], message: string) {
  return commitMultipleJsonFiles(buildStateFiles(state, keys), message);
}

async function runDirectMutation<T>(
  keys: StateFileKey[],
  message: string,
  mutate: (state: GameDatabaseState) => { success: boolean; state: GameDatabaseState; result?: T; error?: string }
): Promise<DirectAdminActionResult<T>> {
  return writeQueue.enqueue(async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const remoteState = await loadRemoteGameState();
        const mutation = mutate(remoteState);
        if (!mutation.success) return { success: false, error: mutation.error || 'Ação rejeitada pelas regras do jogo.' };
        await commitStateFiles(mutation.state, keys, message);
        return { success: true, state: mutation.state, result: mutation.result };
      } catch (error: any) {
        const normalized = normalizeError(error);
        if (normalized.conflict && attempt === 0) continue;
        return { success: false, ...normalized };
      }
    }
    return { success: false, conflict: true, error: 'Conflito ao gravar JSON remoto. Recarregue os dados e tente novamente.' };
  });
}

function generateUsername(firstName: string, lastName: string, users: User[]): string {
  const base = `${firstName.trim().toLowerCase()}_${lastName.trim().toLowerCase()}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!base || base.length < 3) throw new Error('Nome de usuário inválido. Use nome e sobrenome com pelo menos 3 caracteres no total.');

  const existing = new Set(users.map(user => user.username.toLowerCase()));
  if (!existing.has(base)) return base;
  let suffix = 2;
  while (existing.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

function createReferralToken(prefix: string): string {
  return `ref_${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`.toLowerCase();
}

function updateReferralAfterUserCreation(state: GameDatabaseState, indicadorUsername: string, newUser: User, treeId: number): Referral | null {
  const query = indicadorUsername.trim();
  const indicadorUser = state.users.find(user => user.username.toLowerCase() === query.toLowerCase());

  const usedReferral = state.referrals.find(referral => referral.isActive && referral.token === query)
    || state.referrals.find(referral =>
      referral.isActive
      && referral.treeId === treeId
      && (!indicadorUser || referral.referrerUserId === indicadorUser.id)
    );

  if (usedReferral) {
    usedReferral.registrationsCount += 1;
    if (!usedReferral.referredUserId) usedReferral.referredUserId = newUser.id;
  }

  const existingOwnReferral = state.referrals.find(referral =>
    referral.referrerUserId === newUser.id
    && referral.treeId === treeId
    && referral.isActive
  );
  if (existingOwnReferral) return existingOwnReferral;

  const referral: Referral = {
    id: nextId(state.referrals),
    referrerUserId: newUser.id,
    referredUserId: null,
    treeId,
    token: createReferralToken(`${newUser.username}_${treeId}`),
    clicks: 0,
    registrationsCount: 0,
    isActive: true,
    createdAt: new Date().toISOString()
  };
  state.referrals.push(referral);
  return referral;
}

export async function createTreeDirect(params: { categoryId: number; troncoUserId: number } & ActorParams) {
  return runDirectMutation(
    ['trees', 'users', 'referrals', 'auditLog'],
    '[game-data] admin criou árvore via GitHub API direta',
    state => {
      const actor = resolveAdminActor(state, params);
      return createTreeByAdmin(state, {
        categoryId: Number(params.categoryId),
        troncoUserId: Number(params.troncoUserId),
        actor,
        idempotencyKey: createIdempotencyKey(`direct_create_tree_${params.categoryId}_${params.troncoUserId}`)
      });
    }
  );
}

export async function createUserDirect(params: { indicadorUsername: string; firstName: string; lastName: string } & ActorParams) {
  return runDirectMutation(
    ['users', 'wallets', 'referrals', 'ledger', 'auditLog'],
    '[game-data] admin criou usuário via GitHub API direta',
    state => {
      resolveAdminActor(state, params);
      const fullName = `${params.firstName.trim()} ${params.lastName.trim()}`.trim();
      const username = generateUsername(params.firstName, params.lastName, state.users);
      const res = createParticipant(state, {
        username,
        name: fullName,
        indicadorUsername: params.indicadorUsername,
        githubActor: null,
        idempotencyKey: createIdempotencyKey(`direct_admin_create_user_${username}`)
      });
      if (!res.success || !res.result) return res;
      const referral = updateReferralAfterUserCreation(res.state, params.indicadorUsername, res.result.user, res.result.treeId);
      return {
        success: true,
        state: res.state,
        result: { user: res.result.user, walletSeeds: res.result.tokensGranted, treeId: res.result.treeId, referral }
      };
    }
  );
}

export async function archiveTreeDirect(params: { treeId: number; reason?: string } & ActorParams) {
  return runDirectMutation(
    ['trees', 'users', 'referrals', 'auditLog'],
    '[game-data] admin arquivou árvore via GitHub API direta',
    state => {
      const actor = resolveAdminActor(state, params);
      return archiveTreeByAdmin(state, {
        treeId: Number(params.treeId),
        reason: params.reason || 'Arquivamento administrativo',
        actor,
        idempotencyKey: createIdempotencyKey(`direct_archive_tree_${params.treeId}`)
      });
    }
  );
}

export async function assignPositionDirect(params: { treeId: number; positionIndex: number; userId: number } & ActorParams) {
  return runDirectMutation(
    ['trees', 'users', 'auditLog'],
    '[game-data] admin atribuiu posição via GitHub API direta',
    state => {
      const actor = resolveAdminActor(state, params);
      return assignTreePositionByAdmin(state, {
        treeId: Number(params.treeId),
        positionIndex: Number(params.positionIndex),
        userId: Number(params.userId),
        actor,
        idempotencyKey: createIdempotencyKey(`direct_assign_${params.treeId}_${params.positionIndex}_${params.userId}`)
      });
    }
  );
}

export async function clearPositionDirect(params: { treeId: number; positionIndex: number } & ActorParams) {
  return runDirectMutation(
    ['trees', 'users', 'auditLog'],
    '[game-data] admin liberou posição via GitHub API direta',
    state => {
      const actor = resolveAdminActor(state, params);
      return clearTreePositionByAdmin(state, {
        treeId: Number(params.treeId),
        positionIndex: Number(params.positionIndex),
        actor,
        idempotencyKey: createIdempotencyKey(`direct_clear_${params.treeId}_${params.positionIndex}`)
      });
    }
  );
}
