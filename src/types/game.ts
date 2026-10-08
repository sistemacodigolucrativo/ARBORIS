export type UserRole = 'participant' | 'admin';
export type UserStatus = 'active' | 'blocked';
export type TreeStatus = 'active' | 'completed' | 'archived';
export type PositionSide = 'root' | 'left' | 'right';
export type PositionActivationStatus = 'reserved' | 'active';
export type ActivationRequestStatus = 'pending' | 'approved' | 'rejected';
export type LedgerEntryType = 'CONCESSAO_INICIAL_SEMENTES' | 'BAG_PLANTIO' | 'FORTALECIMENTO_TRONCO' | 'RESERVA_VAGA' | 'AJUSTE_ADMINISTRATIVO';

export interface GameConfig {
  systemMode: 'active' | 'maintenance';
  initialSeedsGrant: number; // 25
  transferAmount: number; // 25
  treeSplitPolicy: 'tree_split_1_2_4_8';
  maxTreesPerUser: number;
  memberPanelLayout: 'classic' | 'aurora';
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
  pixHolderName?: string | null;
  pixKeyType?: 'random' | 'email' | 'phone' | null;
  pixKey?: string | null;
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
  activationStatus?: PositionActivationStatus | null;
  occupiedAt: string | null;
  username?: string | null;
  name?: string | null;
}

export interface Tree {
  id: number;
  categoryId: number;
  treeCode: string;
  nickname?: string | null;
  tokenRequirement?: number | null;
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

export interface ActivationRequest {
  id: number;
  requesterUserId: number;
  troncoUserId: number;
  treeId: number;
  positionIndex: number;
  amount: number;
  status: ActivationRequestStatus;
  requesterUsername: string;
  troncoUsername: string;
  whatsappMessage?: string | null;
  createdAt: string;
  decidedAt?: string | null;
  decisionNote?: string | null;
}

export interface PlantingBagEntry {
  id: number;
  userId: number;
  treeId: number;
  amount: number;
  source: 'reservation';
  createdAt: string;
  username?: string;
}

export interface PlantingDraw {
  id: number;
  threshold: number;
  amountConsumed: number;
  selectedUserIds: number[];
  selectedTreeIds: number[];
  status: 'pending';
  createdAt: string;
}

export interface PlantingAssignment {
  id: number;
  drawId: number;
  userId: number;
  username: string;
  treeId: number;
  status: 'pending';
  createdAt: string;
}

export interface PlantingBag {
  balance: number;
  threshold: number;
  selectionCount: number;
  entries: PlantingBagEntry[];
  draws: PlantingDraw[];
  assignments: PlantingAssignment[];
  updatedAt: string | null;
}

export interface GameDatabaseState {
  config: GameConfig;
  users: User[];
  wallets: Wallet[];
  trees: Tree[];
  referrals: Referral[];
  ledger: LedgerEntry[];
  auditLog: AuditLogEntry[];
  activationRequests?: ActivationRequest[];
  plantingBag?: PlantingBag;
}
