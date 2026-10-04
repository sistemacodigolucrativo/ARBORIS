from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'src' / 'App.tsx'
DATA_STORE = ROOT / 'src' / 'services' / 'dataStore.ts'

DATASTORE_NEW = '''  /**
   * Admin: creates a new tree immediately in the current panel state.
   *
   * GitHub Pages cannot safely write repository JSON directly from the browser without
   * exposing a GitHub token. This operation therefore updates the loaded game state and
   * browser cache immediately so the admin panel behaves as a direct editor.
   */
  async createTreeAction(categoryId: number, troncoUserId: number) {
    if (!this.state) await this.loadState();

    const tronco = this.state!.users.find(u => u.id === troncoUserId && u.status === 'active');
    if (!tronco) return { success: false, error: 'Tronco não encontrado ou inativo.' };

    const category = this.state!.config.categories.find(c => c.id === categoryId && c.isActive);
    if (!category) return { success: false, error: 'Categoria não encontrada ou inativa.' };

    const now = new Date().toISOString();
    const nextTreeId = Math.max(0, ...this.state!.trees.map(t => t.id)) + 1;
    const nextReferralId = Math.max(0, ...this.state!.referrals.map(r => r.id)) + 1;
    const nextAuditId = Math.max(0, ...this.state!.auditLog.map(a => a.id)) + 1;
    const nextCycle = Math.max(0, ...this.state!.trees.map(t => t.cycleNumber || 0)) + 1;
    const treeCode = `ARB-TREE-${String(category.tokenRequirement).padStart(2, '0')}-${String(nextTreeId).padStart(3, '0')}`;

    const positions = TOPOLOGY.map(topo => ({
      index: topo.index,
      level: topo.level,
      side: topo.side,
      userId: topo.index === 0 ? tronco.id : null,
      status: topo.index === 0 ? 'occupied' as const : 'vacant' as const,
      occupiedAt: topo.index === 0 ? now : null,
      username: topo.index === 0 ? tronco.username : null,
      name: topo.index === 0 ? tronco.name : null
    }));

    const idempotencyKey = this.createIdempotencyKey(`admin_create_tree_${categoryId}_${troncoUserId}`);

    this.state!.trees.push({
      id: nextTreeId,
      categoryId: category.id,
      treeCode,
      troncoUserId: tronco.id,
      status: 'active',
      cycleNumber: nextCycle,
      parentTreeId: null,
      positions,
      createdAt: now,
      completedAt: null
    });

    this.state!.referrals.push({
      id: nextReferralId,
      referrerUserId: tronco.id,
      referredUserId: null,
      treeId: nextTreeId,
      token: `ref_${treeCode.toLowerCase()}_${Math.random().toString(36).slice(2, 10)}`,
      clicks: 0,
      registrationsCount: 0,
      isActive: true,
      createdAt: now
    });

    if (!tronco.currentTreeId && tronco.currentTreeId !== 0) {
      tronco.currentTreeId = nextTreeId;
      tronco.currentPositionIndex = 0;
      tronco.updatedAt = now;
    }

    this.state!.auditLog.push({
      id: nextAuditId,
      actorUserId: 1,
      actorUsername: 'admin',
      action: 'ADMIN_TREE_CREATED_LOCAL',
      entity: 'tree',
      entityId: nextTreeId,
      metadata: {
        idempotencyKey,
        categoryId: category.id,
        troncoUserId: tronco.id,
        treeCode,
        persistence: 'browser-cache'
      },
      createdAt: now
    });

    this.saveToStorage();
    this.notify();

    return {
      success: true,
      result: {
        tree_id: nextTreeId,
        tree_code: treeCode,
        idempotency_key: idempotencyKey
      }
    };
  }
'''

APP_NEW = '''  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await dataStore.createTreeAction(newTreeCatId, newTreeTroncoId);
      if (res.success && res.result?.tree_id) {
        setShowCreateTreeModal(false);
        setSelectedAdminTreeId(res.result.tree_id);
        await fetchState();
        showToast(`✓ Nova árvore comunitária criada com sucesso (#${res.result.tree_id}).`);
      } else {
        showToast('Erro: ' + (res.error || 'Não foi possível criar a árvore.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    }
  };
'''

store = DATA_STORE.read_text()
store, count = re.subn(
    r"  /\*\*\n   \* Admin: creates a new tree.*?\n  async createTreeAction\(categoryId: number, troncoUserId: number\) \{.*?\n  \}\n\n  async archiveTreeAction",
    DATASTORE_NEW + "\n  async archiveTreeAction",
    store,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit('createTreeAction block not found')
DATA_STORE.write_text(store)

app = APP.read_text()
app, count = re.subn(
    r"  const handleCreateTree = async \(e: React\.FormEvent\) => \{.*?\n  \};\n\n  const openAdminOnlineAction",
    APP_NEW + "\n  const openAdminOnlineAction",
    app,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit('handleCreateTree block not found')
APP.write_text(app)

for cleanup in [
    '.github/workflows/apply-admin-tree-creation-audit-fix.yml',
    'scripts/apply-admin-tree-creation-audit-fix.py'
]:
    p = ROOT / cleanup
    if p.exists():
        p.unlink()
        print(f'removed {cleanup}')

print('Direct admin tree creation applied and temporary patcher removed.')
