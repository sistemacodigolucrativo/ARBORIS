from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "src" / "App.tsx"
DATA_STORE = ROOT / "src" / "services" / "dataStore.ts"


app = APP.read_text()

if "Ação bloqueada: o coordenador não deve fortalecer tronco" not in app:
    old = "  const handleStrengthenTronco = async (userId: number, treeId: number) => {\n    setActivatingTronco(true);"
    new = "  const handleStrengthenTronco = async (userId: number, treeId: number) => {\n    if (currentUser?.role === 'admin') {\n      showToast('Ação bloqueada: o coordenador não deve fortalecer tronco pelo painel de membro. Use Organização > Árvores > Nova Árvore.');\n      return;\n    }\n\n    setActivatingTronco(true);"
    if old not in app:
        raise SystemExit("Pattern not found: strengthen handler")
    app = app.replace(old, new, 1)

if "currentUser.role !== 'admin' && !isUserPositioned" not in app:
    old = "                  {!isUserPositioned && currentUser.balance >= 25 && ("
    new = "                  {currentUser.role !== 'admin' && !isUserPositioned && currentUser.balance >= 25 && ("
    if old not in app:
        raise SystemExit("Pattern not found: strengthen card condition")
    app = app.replace(old, new, 1)

new_handle_create_tree = """  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'admin') {
      showToast('Erro: somente o coordenador pode criar árvore pelo painel administrativo.');
      return;
    }
    if (currentView !== 'admin' || adminTab !== 'global_trees') {
      showToast('Erro: a criação de árvore deve ser feita em Organização > Árvores.');
      return;
    }

    setAdminActionMessage(null);
    try {
      const res = await dataStore.createTreeAction(newTreeCatId, newTreeTroncoId);
      if (res.success && res.result?.request_url) {
        openActionRequest(res.result.request_url);
        setShowCreateTreeModal(false);
        setAdminActionMessage('Solicitação de criação de árvore aberta no GitHub. Envie a issue para a Action validar e gravar nos JSONs.');
        showToast('Solicitação de criação de árvore aberta no GitHub. Envie a issue para gravar a árvore verdadeira nos JSONs.');
      } else {
        showToast('Erro: ' + (res.error || 'Não foi possível criar a solicitação da árvore.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    }
  };
"""

app, count = re.subn(
    r"  const handleCreateTree = async \(e: React\.FormEvent\) => \{.*?\n  \};\n\n  const openAdminOnlineAction",
    new_handle_create_tree + "\n  const openAdminOnlineAction",
    app,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit("Pattern not found: handleCreateTree block")

APP.write_text(app)

store = DATA_STORE.read_text()

if "Coordenador não pode fortalecer tronco pelo fluxo de membro" not in store:
    old = "    if (!user) return { success: false, error: 'Usuário não encontrado.' };\n    if (!tree) return { success: false, error: 'Árvore não encontrada.' };"
    new = "    if (!user) return { success: false, error: 'Usuário não encontrado.' };\n    if (user.role === 'admin') {\n      return { success: false, error: 'Coordenador não pode fortalecer tronco pelo fluxo de membro. Use Organização > Árvores > Nova Árvore.' };\n    }\n    if (!tree) return { success: false, error: 'Árvore não encontrada.' };"
    if old not in store:
        raise SystemExit("Pattern not found: strengthen action validation")
    store = store.replace(old, new, 1)

new_create_tree_action = """  /**
   * Admin: creates a new tree through the online JSON workflow.
   */
  async createTreeAction(categoryId: number, troncoUserId: number) {
    if (!this.state) await this.loadState();
    const tronco = this.state!.users.find(u => u.id === troncoUserId && u.status === 'active');
    if (!tronco) return { success: false, error: 'Tronco não encontrado ou inativo.' };
    if (tronco.role === 'admin') return { success: false, error: 'O coordenador não pode ser usado como tronco inicial de uma nova árvore.' };
    const category = this.state!.config.categories.find(c => c.id === categoryId && c.isActive);
    if (!category) return { success: false, error: 'Categoria não encontrada ou inativa.' };
    const payload: OnlineActionPayload = {
      action: 'create_tree',
      params: { categoryId, troncoUserId },
      idempotencyKey: this.createIdempotencyKey(`admin_create_tree_${categoryId}_${troncoUserId}`)
    };
    return {
      success: true,
      result: {
        request_url: this.createGameActionIssueUrl(payload),
        idempotency_key: payload.idempotencyKey
      }
    };
  }

"""

store, count = re.subn(
    r"  /\*\*\n   \* Admin: creates a new tree.*?\n  async createTreeAction\(categoryId: number, troncoUserId: number\) \{.*?\n  \}\n\n  async archiveTreeAction",
    new_create_tree_action + "  async archiveTreeAction",
    store,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit("Pattern not found: createTreeAction block")

DATA_STORE.write_text(store)

print('Admin tree creation workflow restored to create_tree issue flow and strengthen_tronco blocked for admin.')
