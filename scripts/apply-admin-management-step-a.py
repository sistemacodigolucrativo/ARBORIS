from pathlib import Path

DATASTORE_OLD = """  /**
   * Admin: creates a new tree through the online JSON workflow.
   */
  async createTreeAction(categoryId: number, troncoUserId: number) {
    if (!this.state) await this.loadState();
    const tronco = this.state!.users.find(u => u.id === troncoUserId && u.status === 'active');
    if (!tronco) return { success: false, error: 'Tronco não encontrado ou inativo.' };
    const category = this.state!.config.categories.find(c => c.id === categoryId && c.isActive);
    if (!category) return { success: false, error: 'Categoria não encontrada ou inativa.' };
    const payload: OnlineActionPayload = {
      action: 'create_tree',
      params: { categoryId, troncoUserId },
      idempotencyKey: this.createIdempotencyKey(`admin_create_tree_${categoryId}_${troncoUserId}`)
    };
    return { success: true, result: { request_url: this.createGameActionIssueUrl(payload), idempotency_key: payload.idempotencyKey } };
  }
"""

DATASTORE_NEW = """  /**
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
"""

APP_OLD = """  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await dataStore.createTreeAction(newTreeCatId, newTreeTroncoId);
      if (res.success && res.result?.request_url) {
        openActionRequest(res.result.request_url);
        setShowCreateTreeModal(false);
        showToast('Solicitação de criação de árvore aberta no GitHub. Envie a issue para a Action validar e gravar nos JSONs.');
      } else {
        showToast('Erro: ' + (res.error || 'Não foi possível criar a solicitação da árvore.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    }
  };
"""

APP_NEW = """  const handleCreateTree = async (e: React.FormEvent) => {
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
"""


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if new in text:
        print(f'{path}: already patched')
        return
    if old not in text:
        raise SystemExit(f'{path}: target block not found')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')
    print(f'{path}: patched')

replace_once('src/services/dataStore.ts', DATASTORE_OLD, DATASTORE_NEW)
replace_once('src/App.tsx', APP_OLD, APP_NEW)

for cleanup in [
    '.github/workflows/apply-admin-management.yml',
    '.github/workflows/apply-create-tree-direct-fix.yml',
    'scripts/apply-admin-management-step-a.py',
    'scripts/apply-admin-management-step-b.py',
    'scripts/apply-admin-management-step-c.py'
]:
    p = Path(cleanup)
    if p.exists():
        p.unlink()
        print(f'removed {cleanup}')

print('direct create-tree patch complete')
