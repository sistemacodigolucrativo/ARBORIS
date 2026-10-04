export type UserRole = 'participant' | 'admin';
export type UserStatus = 'active' | 'blocked';
export type TreeStatus = 'active' | 'completed';
export type PositionSide = 'root' | 'left' | 'right';
export type LedgerEntryType = 'CONCESSAO_INICIAL_SEMENTES' | 'FORTALECIMENTO_TRONCO' | 'AJUSTE_ADMINISTRATIVO';

export interface GameConfig {
  systemMode: 'active' | 'maintenance';
  initialSeedsGrant: number; // 25
  transferAmount: number; // 25
  treeSplitPolicy: 'tree_split_1_2_4_8';
  maxTreesPerUser: number;
  categories: Array<{
    id: number;
    code: string;
    name: string;
    tokenRequirement: number;
    isActive: boolean;
    description: string;
  }>;
}

export interface User {
  id: number;
  username: string;
  name: string;
  githubActor?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  currentTreeId?: number | null;
  currentPositionIndex?: number | null;
}

export interface Wallet {
  userId: number;
  balance: number;
  updatedAt: string;
}

export interface TreePosition {
  index: number; // 0..14
  level: number; // 0, 1, 2, 3
  side: PositionSide;
  userId: number | null;
  status: 'vacant' | 'occupied';
  occupiedAt: string | null;
  username?: string | null;
  name?: string | null;
}

export interface Tree {
  id: number;
  categoryId: number;
  treeCode: string;
  troncoUserId: number;
  status: TreeStatus;
  cycleNumber: number;
  parentTreeId: number | null;
  positions: TreePosition[];
  createdAt: string;
  completedAt: string | null;
}

export interface Referral {
  id: number;
  referrerUserId: number;
  referredUserId: number | null;
  treeId: number;
  token: string;
  clicks: number;
  registrationsCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface LedgerEntry {
  id: number;
  type: LedgerEntryType;
  fromUserId: number | null;
  toUserId: number;
  treeId: number | null;
  amount: number;
  reason: string;
  idempotencyKey: string;
  createdAt: string;
  fromUsername?: string;
  toUsername?: string;
}

export interface AuditLogEntry {
  id: number;
  actorUserId: number;
  action: string;
  entity: string;
  entityId: number | string;
  metadata: Record<string, any>;
  createdAt: string;
  actorUsername?: string;
}

export interface GameDatabaseState {
  config: GameConfig;
  users: User[];
  wallets: Wallet[];
  trees: Tree[];
  referrals: Referral[];
  ledger: LedgerEntry[];
  auditLog: AuditLogEntry[];
}
