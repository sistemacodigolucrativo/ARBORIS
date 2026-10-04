from pathlib import Path
import re
import textwrap

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'src' / 'App.tsx'
DATA_STORE = ROOT / 'src' / 'services' / 'dataStore.ts'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Pattern not found: {label}')
    return text.replace(old, new, 1)


def replace_between(text: str, start: str, end: str, replacement: str, label: str) -> str:
    i = text.find(start)
    if i == -1:
        raise SystemExit(f'Start pattern not found: {label}')
    j = text.find(end, i)
    if j == -1:
        raise SystemExit(f'End pattern not found: {label}')
    return text[:i] + textwrap.dedent(replacement).rstrip() + '\n\n' + text[j:]

store = DATA_STORE.read_text(encoding='utf-8')
if 'replaceState(nextState: GameDatabaseState)' not in store:
    store = replace_once(
        store,
        "  getState(): GameDatabaseState | null {\n    return this.state;\n  }\n",
        "  getState(): GameDatabaseState | null {\n    return this.state;\n  }\n\n  replaceState(nextState: GameDatabaseState): GameDatabaseState {\n    this.state = nextState;\n    this.saveToStorage();\n    this.notify();\n    return this.state;\n  }\n",
        'dataStore.replaceState'
    )
DATA_STORE.write_text(store, encoding='utf-8')

app = APP.read_text(encoding='utf-8')
if "./services/directAdminActions" not in app:
    app = replace_once(
        app,
        "import { dataStore } from './services/dataStore';\n",
        "import { dataStore } from './services/dataStore';\nimport {\n  archiveTreeDirect,\n  assignPositionDirect,\n  clearPositionDirect,\n  createTreeDirect,\n  createUserDirect\n} from './services/directAdminActions';\n",
        'direct action imports'
    )

if 'const applyDirectAdminState = async (res: any)' not in app:
    app = replace_once(
        app,
        "  const openActionRequest = (url: string) => {\n    const opened = window.open(url, '_blank', 'noopener,noreferrer');\n    if (!opened) {\n      window.location.assign(url);\n    }\n  };\n",
        "  const openActionRequest = (url: string) => {\n    const opened = window.open(url, '_blank', 'noopener,noreferrer');\n    if (!opened) {\n      window.location.assign(url);\n    }\n  };\n\n  const applyDirectAdminState = async (res: any) => {\n    if (res?.state) {\n      dataStore.replaceState(res.state);\n      const stateView = dataStore.getSystemStateView();\n      if (stateView) {\n        setSystemState(stateView);\n        if (currentUser) {\n          const fresh = stateView.users.find((u: User) => u.id === currentUser.id);\n          if (fresh) setCurrentUser(fresh);\n        }\n      }\n      return;\n    }\n\n    await fetchState(true);\n  };\n",
        'applyDirectAdminState'
    )

app = replace_between(
    app,
    "  const handleAdminCreateUser = async (e: React.FormEvent) => {",
    "  // ATOMIC POSITION CLAIM & STRENGTHENING:",
    r'''
      const handleAdminCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminValidatedIndicadorData) {
          setAdminCreateUserError('Valide o indicador antes de criar o usuário.');
          return;
        }
        if (!adminCreateFirstName.trim() || !adminCreateLastName.trim()) {
          setAdminCreateUserError('Preencha nome e sobrenome do novo usuário.');
          return;
        }
        if (currentUser?.role !== 'admin') {
          setAdminCreateUserError('Somente o coordenador pode criar usuário pelo painel administrativo.');
          return;
        }

        setAdminCreateUserLoading(true);
        setAdminCreateUserError(null);
        try {
          const res = await createUserDirect({
            indicadorUsername: adminValidatedIndicadorData.username,
            firstName: adminCreateFirstName.trim(),
            lastName: adminCreateLastName.trim(),
            actorUserId: currentUser.id,
            actorUsername: currentUser.username
          });

          if (res.success) {
            await applyDirectAdminState(res);
            showToast('Usuário criado e salvo nos JSONs do repositório.');
            setAdminCreateUserError(null);
            setAdminCreateFirstName('');
            setAdminCreateLastName('');
            setAdminValidatedIndicadorData(null);
          } else {
            setAdminCreateUserError(res.error || 'Falha ao criar usuário pelo painel administrativo.');
          }
        } catch (err: any) {
          setAdminCreateUserError('Erro ao criar usuário: ' + err.message);
        } finally {
          setAdminCreateUserLoading(false);
        }
      };
    ''',
    'handleAdminCreateUser'
)

app = replace_between(
    app,
    "  const handleCreateTree = async (e: React.FormEvent) => {",
    "  const handleArchiveSelectedTree = async () => {",
    r'''
      const handleCreateTree = async (e: React.FormEvent) => {
        e.preventDefault();
        if (currentUser?.role !== 'admin') {
          showToast('Erro: somente o coordenador pode criar árvore pelo painel administrativo.');
          return;
        }
        if (currentView !== 'admin' || adminTab !== 'global_trees') {
          showToast('Erro: a criação de árvore deve ser feita em Organização > Árvores.');
          return;
        }

        setAdminActionLoading(true);
        setAdminActionMessage(null);
        try {
          const res = await createTreeDirect({
            categoryId: newTreeCatId,
            troncoUserId: newTreeTroncoId,
            actorUserId: currentUser.id,
            actorUsername: currentUser.username
          });

          if (res.success) {
            await applyDirectAdminState(res);
            const treeId = (res.result as any)?.tree?.id;
            if (treeId) setSelectedAdminTreeId(treeId);
            setShowCreateTreeModal(false);
            setAdminActionMessage('Árvore criada e salva nos JSONs do repositório.');
            showToast('Árvore criada e salva nos JSONs do repositório.');
          } else {
            const error = res.error || 'Não foi possível criar a árvore nos JSONs do repositório.';
            setAdminActionMessage(error);
            showToast('Erro: ' + error);
          }
        } catch (e: any) {
          setAdminActionMessage('Erro ao criar árvore: ' + e.message);
          showToast('Erro: ' + e.message);
        } finally {
          setAdminActionLoading(false);
        }
      };

      const openAdminOnlineAction = async (res: any, successMessage: string) => {
        if (res.success) {
          await applyDirectAdminState(res);
          setAdminActionMessage(successMessage);
          showToast(successMessage);
          return;
        }

        const error = res.error || 'Não foi possível salvar a ação administrativa nos JSONs do repositório.';
        setAdminActionMessage(error);
        showToast('Erro: ' + error);
      };
    ''',
    'handleCreateTree and admin result helper'
)

app = replace_once(
    app,
    "      const res = await dataStore.archiveTreeAction(adminTree.id, 'Arquivamento administrativo pelo painel');\n      openAdminOnlineAction(res, 'Solicitação de arquivamento aberta.');",
    "      const res = await archiveTreeDirect({\n        treeId: adminTree.id,\n        reason: 'Arquivamento administrativo pelo painel',\n        actorUserId: currentUser?.id,\n        actorUsername: currentUser?.username\n      });\n      await openAdminOnlineAction(res, 'Árvore arquivada e salva nos JSONs do repositório.');",
    'archive direct call'
)
app = replace_once(
    app,
    "      const res = await dataStore.assignTreePositionAction(adminTree.id, selectedNode.position_index, adminSelectedUserId);\n      openAdminOnlineAction(res, `Solicitação para atribuir/mover membro à posição #${selectedNode.position_index} aberta.`);",
    "      const res = await assignPositionDirect({\n        treeId: adminTree.id,\n        positionIndex: selectedNode.position_index,\n        userId: adminSelectedUserId,\n        actorUserId: currentUser?.id,\n        actorUsername: currentUser?.username\n      });\n      await openAdminOnlineAction(res, `Membro atribuído à posição #${selectedNode.position_index} e salvo nos JSONs do repositório.`);",
    'assign direct call'
)
app = replace_once(
    app,
    "      const res = await dataStore.clearTreePositionAction(adminTree.id, selectedNode.position_index);\n      openAdminOnlineAction(res, `Solicitação para liberar a posição #${selectedNode.position_index} aberta.`);",
    "      const res = await clearPositionDirect({\n        treeId: adminTree.id,\n        positionIndex: selectedNode.position_index,\n        actorUserId: currentUser?.id,\n        actorUsername: currentUser?.username\n      });\n      await openAdminOnlineAction(res, `Posição #${selectedNode.position_index} liberada e salva nos JSONs do repositório.`);",
    'clear direct call'
)
APP.write_text(app, encoding='utf-8')
print('Direct admin GitHub JSON wiring applied.')
