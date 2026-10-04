import {
  GameDatabaseState,
  GameConfig,
  User,
  Wallet,
  Tree,
  Referral,
  LedgerEntry,
  AuditLogEntry
} from '../types/game';
import {
  createParticipant,
  strengthenTronco,
  validateReferral,
  TOPOLOGY
} from './gameEngine';

const STORAGE_KEY = 'arboris_game_state_v1';

class DataStoreService {
  private state: GameDatabaseState | null = null;
  private listeners: Array<() => void> = [];

  private getBaseUrl(): string {
    const base = import.meta.env.BASE_URL || './';
    return base.endsWith('/') ? base : `${base}/`;
  }

  /**
   * Loads initial data from static JSON files in GitHub Pages or localStorage cache.
   */
  async loadState(forceReloadFromJson = false): Promise<GameDatabaseState> {
    if (!forceReloadFromJson) {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          this.state = JSON.parse(cached);
          this.notify();
          return this.state!;
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    }

    const baseUrl = this.getBaseUrl();
    const fetchJson = async <T>(fileName: string): Promise<T> => {
      // Try relative to base URL, then fallback to /data/
      const primaryUrl = `${baseUrl}data/${fileName}`;
      try {
        const res = await fetch(primaryUrl);
        if (res.ok) return await res.json();
      } catch {}

      const fallbackUrl = `/data/${fileName}`;
      const resFallback = await fetch(fallbackUrl);
      if (!resFallback.ok) {
        throw new Error(`Não foi possível carregar o arquivo estático ${fileName}`);
      }
      return await resFallback.json();
    };

    const [config, users, wallets, trees, referrals, ledger, auditLog] = await Promise.all([
      fetchJson<GameConfig>('config.json'),
      fetchJson<User[]>('users.json'),
      fetchJson<Wallet[]>('wallets.json'),
      fetchJson<Tree[]>('trees.json'),
      fetchJson<Referral[]>('referrals.json'),
      fetchJson<LedgerEntry[]>('ledger.json'),
      fetchJson<AuditLogEntry[]>('audit-log.json')
    ]);

    this.state = {
      config,
      users,
      wallets,
      trees,
      referrals,
      ledger,
      auditLog
    };

    this.saveToStorage();
    this.notify();
    return this.state;
  }

  private saveToStorage() {
    if (this.state) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }
    }
  }

  resetToDefault() {
    localStorage.removeItem(STORAGE_KEY);
    return this.loadState(true);
  }

  getState(): GameDatabaseState | null {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /**
   * Validates referral token or username for Lock Screen.
   */
  validateIndicador(usernameOrToken: string) {
    if (!this.state) throw new Error('Estado do jogo ainda não carregado.');
    const result = validateReferral(this.state, usernameOrToken);
    if (!result.valid || !result.tree || !result.referrer) {
      return { success: false, error: result.error || 'Indicador inválido.' };
    }

    const category = this.state.config.categories.find(c => c.id === result.tree!.categoryId);
    const tronco = this.state.users.find(u => u.id === result.tree!.troncoUserId);

    return {
      success: true,
      data: {
        user_id: result.referrer.id,
        username: result.referrer.username,
        full_name: result.referrer.name,
        tree_id: result.tree.id,
        tree_code: result.tree.treeCode,
        category_name: category?.name || 'Comunitária',
        token_requirement: category?.tokenRequirement || 25,
        tronco_user_id: result.tree.troncoUserId,
        tronco_username: tronco?.username || 'tronco'
      }
    };
  }

  /**
   * Registers a participant and credits initial seeds.
   */
  async registerParticipant(params: {
    indicadorUsername: string;
    firstName: string;
    lastName: string;
  }) {
    if (!this.state) await this.loadState();
    const fullName = `${params.firstName.trim()} ${params.lastName.trim()}`.trim();
    const username = `${params.firstName.trim().toLowerCase()}_${params.lastName.trim().toLowerCase()}`.replace(/[^a-z0-9_]/g, '');

    const res = createParticipant(this.state!, {
      username,
      name: fullName,
      indicadorUsername: params.indicadorUsername
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    this.state = res.state;
    this.saveToStorage();
    this.notify();

    return {
      success: true,
      result: {
        user_id: res.result!.user.id,
        username: res.result!.user.username,
        full_name: res.result!.user.name,
        tokens_granted: res.result!.tokensGranted,
        tree_id: res.result!.treeId
      }
    };
  }

  /**
   * Executes atomic strengthen tronco action with 1-2-4-8 progression.
   */
  async strengthenTroncoAction(userId: number, treeId: number) {
    if (!this.state) await this.loadState();
    const res = strengthenTronco(this.state!, { userId, treeId });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    this.state = res.state;
    this.saveToStorage();
    this.notify();

    return {
      success: true,
      result: {
        position_index: res.result!.positionIndex,
        bifurcated: res.result!.bifurcated,
        new_trees: res.result!.newTrees
      }
    };
  }

  /**
   * Admin: Creates a new community tree manually.
   */
  async createTreeAction(categoryId: number, troncoUserId: number) {
    if (!this.state) await this.loadState();
    const tronco = this.state!.users.find(u => u.id === troncoUserId);
    if (!tronco) return { success: false, error: 'Tronco não encontrado.' };

    const category = this.state!.config.categories.find(c => c.id === categoryId);
    if (!category) return { success: false, error: 'Categoria não encontrada.' };

    const newTreeId = Math.max(0, ...this.state!.trees.map(t => t.id)) + 1;
    const now = new Date().toISOString();

    const positions = TOPOLOGY.map(topo => {
      if (topo.index === 0) {
        return {
          index: 0,
          level: 0,
          side: topo.side,
          userId: tronco.id,
          status: 'occupied' as const,
          occupiedAt: now,
          username: tronco.username,
          name: tronco.name
        };
      }
      return {
        index: topo.index,
        level: topo.level,
        side: topo.side,
        userId: null,
        status: 'vacant' as const,
        occupiedAt: null,
        username: null,
        name: null
      };
    });

    const newTree: Tree = {
      id: newTreeId,
      categoryId,
      treeCode: `ARB-TREE-${category.tokenRequirement}-${String(newTreeId).padStart(3, '0')}`,
      troncoUserId,
      status: 'active',
      cycleNumber: 1,
      parentTreeId: null,
      positions,
      createdAt: now,
      completedAt: null
    };

    this.state!.trees.push(newTree);

    // Referral link for new tree
    const nextRefId = Math.max(0, ...this.state!.referrals.map(r => r.id)) + 1;
    const refToken = `ref_${newTree.treeCode.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`;
    this.state!.referrals.push({
      id: nextRefId,
      referrerUserId: troncoUserId,
      referredUserId: null,
      treeId: newTreeId,
      token: refToken,
      clicks: 0,
      registrationsCount: 0,
      isActive: true,
      createdAt: now
    });

    this.saveToStorage();
    this.notify();

    return { success: true, treeId: newTreeId };
  }

  /**
   * Admin: Toggles user status between active and blocked.
   */
  async toggleUserStatusAction(userId: number) {
    if (!this.state) await this.loadState();
    const user = this.state!.users.find(u => u.id === userId);
    if (!user || user.id === 1) {
      return { success: false, error: 'Usuário inválido ou protegido.' };
    }

    user.status = user.status === 'active' ? 'blocked' : 'active';
    user.updatedAt = new Date().toISOString();

    this.saveToStorage();
    this.notify();
    return { success: true, newStatus: user.status };
  }

  /**
   * Formats the state for compatibility with existing UI components.
   */
  getSystemStateView() {
    if (!this.state) return null;

    // Flatten positions and augment with user balances
    const augmentedUsers = this.state.users.map(u => {
      const wallet = this.state!.wallets.find(w => w.userId === u.id);
      return {
        ...u,
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

    const formattedLedger = this.state.ledger.map(l => ({
      id: l.id,
      transaction_uuid: `tx_${l.id}`,
      user_id: l.toUserId,
      type: l.type,
      amount: l.amount,
      balance_before: 0,
      balance_after: 0,
      status: 'completed',
      idempotency_key: l.idempotencyKey,
      created_at: l.createdAt,
      username: l.toUsername
    }));

    const formattedAudit = this.state.auditLog.map(a => ({
      id: a.id,
      user_id: a.actorUserId,
      action: a.action,
      entity_type: a.entity,
      entity_id: typeof a.entityId === 'number' ? a.entityId : 0,
      details: typeof a.metadata === 'string' ? a.metadata : JSON.stringify(a.metadata),
      ip_address: 'static-github-pages',
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
