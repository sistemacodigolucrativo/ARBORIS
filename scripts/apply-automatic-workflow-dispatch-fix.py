from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'src' / 'App.tsx'
DATA_STORE = ROOT / 'src' / 'services' / 'dataStore.ts'
WORKFLOW = ROOT / '.github' / 'workflows' / 'process-game-dispatch.yml'
WORKER = ROOT / 'docs' / 'cloudflare-worker-arboris-dispatcher.js'
DOC = ROOT / 'docs' / 'ACTION_DISPATCHER.md'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Pattern not found: {label}')
    return text.replace(old, new, 1)


def regex_replace_once(text: str, pattern: str, repl: str, label: str) -> str:
    text2, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'Regex pattern not found: {label}')
    return text2

store = DATA_STORE.read_text()

store = replace_once(
    store,
    "const ISSUE_URL = `https://github.com/${REPOSITORY}/issues/new`;\n",
    "const ISSUE_URL = `https://github.com/${REPOSITORY}/issues/new`;\nconst ACTION_DISPATCHER_URL = (import.meta.env.VITE_ARBORIS_ACTION_DISPATCHER_URL || '').trim();\nconst ADMIN_EXECUTION_KEY_STORAGE = 'arboris_admin_execution_key_v1';\n",
    'dispatcher constants',
)

store = replace_once(
    store,
    "  private createGameActionIssueUrl(payload: OnlineActionPayload): string {\n",
    "  private getAdminExecutionKey(): string | null {\n    if (typeof window === 'undefined') return null;\n\n    const cached = window.localStorage.getItem(ADMIN_EXECUTION_KEY_STORAGE);\n    if (cached) return cached;\n\n    const typed = window.prompt('Digite a chave de execução administrativa do Arboris para disparar o workflow automaticamente.');\n    const key = typed?.trim();\n    if (!key) return null;\n\n    window.localStorage.setItem(ADMIN_EXECUTION_KEY_STORAGE, key);\n    return key;\n  }\n\n  private async dispatchActionThroughWorkflow(payload: OnlineActionPayload) {\n    if (!ACTION_DISPATCHER_URL) {\n      return {\n        success: false,\n        error: 'Executor automático não configurado. Configure VITE_ARBORIS_ACTION_DISPATCHER_URL com um proxy seguro; o GitHub Pages não pode disparar workflow com token direto no navegador.'\n      };\n    }\n\n    const adminKey = this.getAdminExecutionKey();\n    if (!adminKey) {\n      return {\n        success: false,\n        error: 'Chave de execução administrativa não informada.'\n      };\n    }\n\n    try {\n      const response = await fetch(ACTION_DISPATCHER_URL, {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json',\n          'X-Arboris-Admin-Key': adminKey\n        },\n        body: JSON.stringify({ payload })\n      });\n\n      const text = await response.text();\n      let data: any = {};\n      try {\n        data = text ? JSON.parse(text) : {};\n      } catch {\n        data = { message: text };\n      }\n\n      if (!response.ok) {\n        if (response.status === 401 || response.status === 403) {\n          window.localStorage.removeItem(ADMIN_EXECUTION_KEY_STORAGE);\n        }\n        return {\n          success: false,\n          error: data.error || data.message || `Executor automático recusou a ação (${response.status}).`\n        };\n      }\n\n      return {\n        success: true,\n        result: {\n          dispatched: true,\n          run_url: data.run_url || data.html_url || null,\n          idempotency_key: payload.idempotencyKey,\n          message: data.message || 'Workflow automático disparado.'\n        }\n      };\n    } catch (error: any) {\n      return {\n        success: false,\n        error: `Falha ao acionar executor automático: ${error.message}`\n      };\n    }\n  }\n\n  private createGameActionIssueUrl(payload: OnlineActionPayload): string {\n",
    'dispatcher method insertion',
)

create_tree_new = """  /**
   * Admin: creates a new tree through the automatic workflow dispatcher.
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

    return this.dispatchActionThroughWorkflow(payload);
  }
"""

store = regex_replace_once(
    store,
    r"  /\*\*\n   \* Admin: creates a new tree.*?\n  async createTreeAction\(categoryId: number, troncoUserId: number\) \{.*?\n  \}\n\n  async archiveTreeAction",
    create_tree_new + "\n  async archiveTreeAction",
    'createTreeAction automatic dispatch',
)
DATA_STORE.write_text(store)

app = APP.read_text()
handle_create_new = """  const handleCreateTree = async (e: React.FormEvent) => {
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
      if (res.success && res.result?.dispatched) {
        setShowCreateTreeModal(false);
        setAdminActionMessage('Workflow automático disparado. Aguarde a Action gravar os JSONs e o GitHub Pages publicar a atualização. Depois use Recarregar JSON.');
        showToast('Workflow automático iniciado para criar a árvore.');
      } else {
        showToast('Erro: ' + (res.error || 'Não foi possível disparar o workflow de criação da árvore.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    }
  };
"""

app = regex_replace_once(
    app,
    r"  const handleCreateTree = async \(e: React\.FormEvent\) => \{.*?\n  \};\n\n  const openAdminOnlineAction",
    handle_create_new + "\n  const openAdminOnlineAction",
    'handleCreateTree UI automatic dispatch',
)
APP.write_text(app)

print('Automatic workflow dispatcher fix applied.')
# trigger only App/dataStore patch after workflow/docs were added manually
