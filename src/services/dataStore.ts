import type { GameDatabaseState, User } from '../types/game';
import { apiRequest, apiMutation } from './api';

class DataStoreService {
  private state: GameDatabaseState | null = null;
  private user: User | null = null;
  private listeners: Array<() => void> = [];
  async loadState(_force = false): Promise<GameDatabaseState> {
    const data = await apiRequest('/state');
    this.user = data.user;
    return this.replaceState(data.state);
  }
  getSessionUser() { return this.user; }
  getState() { return this.state; }
  replaceState(state: GameDatabaseState) {
    this.state = state;
    this.listeners.forEach(listener => listener());
    return state;
  }
  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }
  resetToDefault() { return this.loadState(); }
  async login(username: string, password: string) {
    await apiRequest('/auth/login', { username, password });
    await this.loadState();
  }
  async logout() {
    await apiRequest('/auth/logout', {});
    this.user = null; this.state = null;
  }
  async validateIndicador(value: string) {
    return apiRequest(`/referrals/validate?value=${encodeURIComponent(value)}`);
  }
  async registerParticipant(params: { indicadorUsername: string; firstName: string; lastName: string; password: string }) {
    return apiMutation('/register', params);
  }
  async strengthenTroncoAction(_userId: number, treeId: number) {
    return apiMutation('/actions', { action: 'strengthen_tronco', params: { treeId } });
  }
  async toggleUserStatusAction(userId: number) {
    const res = await apiMutation('/actions', { action: 'toggle_user_status', params: { userId } });
    return { ...res, newStatus: res.result.newStatus };
  }
  getSystemStateView() {
    if (!this.state) return null;

    // Flatten positions and augment with user balances
    const augmentedUsers = this.state.users.map(u => {
      const wallet = this.state!.wallets.find(w => w.userId === u.id);
      return {
        ...u,
        current_tree_id: u.currentTreeId,
        current_position_index: u.currentPositionIndex,
        email: `${u.username}@arboris.local`,
        full_name: u.name,
        balance: wallet ? wallet.balance : 0
      };
    });

    const flattenedPositions = this.state.trees.flatMap(t =>
      t.positions.map(p => ({
        id: t.id * 100 + p.index,
        tree_id: t.id,
        position_index: p.index,
        level: p.level,
        side: p.side,
        user_id: p.userId,
        status: p.status,
        occupied_at: p.occupiedAt,
        username: p.username,
        full_name: p.name
      }))
    );

    const formattedTrees = this.state.trees.map(t => {
      const tronco = this.state!.users.find(u => u.id === t.troncoUserId);
      const cat = this.state!.config.categories.find(c => c.id === t.categoryId);
      const occupied = t.positions.filter(p => p.status === 'occupied').length;
      return {
        id: t.id,
        category_id: t.categoryId,
        tree_code: t.treeCode,
        tronco_user_id: t.troncoUserId,
        status: t.status,
        cycle_number: t.cycleNumber,
        parent_tree_id: t.parentTreeId,
        completed_at: t.completedAt,
        created_at: t.createdAt,
        tronco_username: tronco?.username,
        tronco_full_name: tronco?.name,
        category_name: cat?.name,
        token_requirement: cat?.tokenRequirement,
        occupied_count: occupied
      };
    });

    const formattedLinks = this.state.referrals.map(r => {
      const user = this.state!.users.find(u => u.id === r.referrerUserId);
      const tree = this.state!.trees.find(t => t.id === r.treeId);
      const cat = tree ? this.state!.config.categories.find(c => c.id === tree.categoryId) : undefined;
      return {
        id: r.id,
        user_id: r.referrerUserId,
        category_id: cat?.id || 1,
        tree_id: r.treeId,
        token: r.token,
        clicks: r.clicks,
        registrations_count: r.registrationsCount,
        is_active: r.isActive ? 1 : 0,
        expires_at: null,
        created_at: r.createdAt,
        username: user?.username,
        full_name: user?.name,
        tree_code: tree?.treeCode
      };
    });

    // Recover opening balances from persisted closing balances and recorded movements.
    const balances = new Map(this.state.wallets.map(w => [w.userId, w.balance]));
    for (const entry of this.state.ledger) {
      balances.set(entry.toUserId, (balances.get(entry.toUserId) || 0) - entry.amount);
      if (entry.fromUserId !== null) balances.set(entry.fromUserId, (balances.get(entry.fromUserId) || 0) + entry.amount);
    }
    const formattedLedger = this.state.ledger.map(l => {
      const userId = l.fromUserId === this.user?.id ? l.fromUserId : l.toUserId;
      const before = balances.get(userId) || 0;
      if (l.fromUserId !== null) balances.set(l.fromUserId, (balances.get(l.fromUserId) || 0) - l.amount);
      balances.set(l.toUserId, (balances.get(l.toUserId) || 0) + l.amount);
      return {
        id: l.id, transaction_uuid: `tx_${l.id}`, user_id: userId,
        type: l.type, amount: userId === l.fromUserId ? -l.amount : l.amount,
        balance_before: before, balance_after: balances.get(userId) || 0,
        status: 'completed', idempotency_key: l.idempotencyKey,
        created_at: l.createdAt, username: userId === l.fromUserId ? l.fromUsername : l.toUsername
      };
    });

    const formattedAudit = this.state.auditLog.map(a => ({
      id: a.id,
      user_id: a.actorUserId,
      action: a.action,
      entity_type: a.entity,
      entity_id: typeof a.entityId === 'number' ? a.entityId : 0,
      details: typeof a.metadata === 'string' ? a.metadata : JSON.stringify(a.metadata),
      ip_address: 'api',
      created_at: a.createdAt,
      username: a.actorUsername
    }));

    return {
      users: augmentedUsers,
      trees: formattedTrees,
      positions: flattenedPositions,
      referral_links: formattedLinks,
      ledger: formattedLedger,
      audit: formattedAudit,
      categories: this.state.config.categories.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        token_requirement: c.tokenRequirement,
        is_active: c.isActive ? 1 : 0,
        description: c.description,
        created_at: '2026-10-02 12:00:00'
      })),
      settings: [
        { id: 1, setting_key: 'system_mode', setting_value: this.state.config.systemMode, description: 'Modo operacional', is_editable: 1, updated_at: '2026-10-02' },
        { id: 2, setting_key: 'transfer_amount_default', setting_value: String(this.state.config.transferAmount), description: 'Sementes por fortalecimento', is_editable: 1, updated_at: '2026-10-02' }
      ]
    };
  }
}

export const dataStore = new DataStoreService();
