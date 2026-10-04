from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "src" / "App.tsx"
CSS = ROOT / "src" / "index.css"

app = APP.read_text(encoding="utf-8")
original_app = app


def must_replace(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Patch anchor not found: {label}")
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# 1) Persist UI session/navigation so F5 does not return to the public landing.
# -----------------------------------------------------------------------------
if "ARBORIS_UI_STATE_KEY" not in app:
    app = must_replace(
        app,
        "interface Setting {\n  id: number;\n  setting_key: string;\n  setting_value: string;\n  description: string;\n}\n\nexport default function App() {",
        "interface Setting {\n  id: number;\n  setting_key: string;\n  setting_value: string;\n  description: string;\n}\n\ntype StoredUiState = {\n  showLandingPage?: boolean;\n  isLocked?: boolean;\n  currentView?: 'member' | 'public' | 'admin';\n  selectedTreeModel?: number;\n  memberTab?: 'my_tree' | 'marketing' | 'wallet';\n  adminTab?: 'global_trees' | 'create_user' | 'members' | 'settings' | 'audit';\n  selectedAdminTreeId?: number;\n  currentUser?: User | null;\n};\n\nconst ARBORIS_UI_STATE_KEY = 'arboris_ui_state_v1';\n\nconst readStoredUiState = (): StoredUiState => {\n  if (typeof window === 'undefined') return {};\n  try {\n    const raw = window.localStorage.getItem(ARBORIS_UI_STATE_KEY);\n    return raw ? JSON.parse(raw) : {};\n  } catch {\n    return {};\n  }\n};\n\nconst persistStoredUiState = (state: StoredUiState) => {\n  if (typeof window === 'undefined') return;\n  try {\n    window.localStorage.setItem(ARBORIS_UI_STATE_KEY, JSON.stringify(state));\n  } catch {\n    // Storage may be unavailable in private browsing; ignore gracefully.\n  }\n};\n\nexport default function App() {\n  const initialUiState = readStoredUiState();",
        "insert UI persistence helpers",
    )

    replacements = [
        (
            "const [showLandingPage, setShowLandingPage] = useState<boolean>(true);",
            "const [showLandingPage, setShowLandingPage] = useState<boolean>(() => initialUiState.showLandingPage ?? true);",
            "showLandingPage lazy state",
        ),
        (
            "const [isLocked, setIsLocked] = useState<boolean>(false);",
            "const [isLocked, setIsLocked] = useState<boolean>(() => initialUiState.isLocked ?? false);",
            "isLocked lazy state",
        ),
        (
            "const [currentView, setCurrentView] = useState<'member' | 'public' | 'admin'>('member');",
            "const [currentView, setCurrentView] = useState<'member' | 'public' | 'admin'>(() => {\n    const stored = initialUiState.currentView;\n    return stored === 'member' || stored === 'public' || stored === 'admin' ? stored : 'member';\n  });",
            "currentView lazy state",
        ),
        (
            "const [selectedTreeModel, setSelectedTreeModel] = useState<number>(1);",
            "const [selectedTreeModel, setSelectedTreeModel] = useState<number>(() => initialUiState.selectedTreeModel ?? 1);",
            "selectedTreeModel lazy state",
        ),
        (
            "const [memberTab, setMemberTab] = useState<'my_tree' | 'marketing' | 'wallet'>('my_tree');",
            "const [memberTab, setMemberTab] = useState<'my_tree' | 'marketing' | 'wallet'>(() => {\n    const stored = initialUiState.memberTab;\n    return stored === 'my_tree' || stored === 'marketing' || stored === 'wallet' ? stored : 'my_tree';\n  });",
            "memberTab lazy state",
        ),
        (
            "const [adminTab, setAdminTab] = useState<'global_trees' | 'create_user' | 'members' | 'settings' | 'audit'>('global_trees');",
            "const [adminTab, setAdminTab] = useState<'global_trees' | 'create_user' | 'members' | 'settings' | 'audit'>(() => {\n    const stored = initialUiState.adminTab;\n    return stored === 'global_trees' || stored === 'create_user' || stored === 'members' || stored === 'settings' || stored === 'audit' ? stored : 'global_trees';\n  });",
            "adminTab lazy state",
        ),
        (
            "const [currentUser, setCurrentUser] = useState<User | null>(null);",
            "const [currentUser, setCurrentUser] = useState<User | null>(() => initialUiState.currentUser ?? null);",
            "currentUser lazy state",
        ),
        (
            "const [selectedAdminTreeId, setSelectedAdminTreeId] = useState<number>(1);",
            "const [selectedAdminTreeId, setSelectedAdminTreeId] = useState<number>(() => initialUiState.selectedAdminTreeId ?? 1);",
            "selectedAdminTreeId lazy state",
        ),
    ]
    for old, new, label in replacements:
        app = must_replace(app, old, new, label)

    app = must_replace(
        app,
        "const [adminCreateUserError, setAdminCreateUserError] = useState<string | null>(null);",
        "const [adminCreateUserError, setAdminCreateUserError] = useState<string | null>(null);\n  const [adminSelectedUserId, setAdminSelectedUserId] = useState<number>(2);\n  const [adminActionLoading, setAdminActionLoading] = useState<boolean>(false);\n  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);",
        "admin action states",
    )

    app = must_replace(
        app,
        "  useEffect(() => {\n    fetchState();",
        "  useEffect(() => {\n    persistStoredUiState({\n      showLandingPage,\n      isLocked,\n      currentView,\n      selectedTreeModel,\n      memberTab,\n      adminTab,\n      selectedAdminTreeId,\n      currentUser\n    });\n  }, [showLandingPage, isLocked, currentView, selectedTreeModel, memberTab, adminTab, selectedAdminTreeId, currentUser]);\n\n  useEffect(() => {\n    fetchState();",
        "persist UI state effect",
    )

# -----------------------------------------------------------------------------
# 2) Fix tree creation: it opens GitHub Action issue, it does not create locally.
# -----------------------------------------------------------------------------
app = must_replace(
    app,
    "  const handleCreateTree = async (e: React.FormEvent) => {\n    e.preventDefault();\n    try {\n      const res = await dataStore.createTreeAction(newTreeCatId, newTreeTroncoId);\n      if (res.success) {\n        showToast(`✓ Nova árvore comunitária criada com sucesso (#${res.treeId})!`);\n        setShowCreateTreeModal(false);\n        await fetchState();\n      } else {\n        showToast('Erro: ' + res.error);\n      }\n    } catch (e: any) {\n      showToast('Erro: ' + e.message);\n    }\n  };",
    "  const handleCreateTree = async (e: React.FormEvent) => {\n    e.preventDefault();\n    try {\n      const res = await dataStore.createTreeAction(newTreeCatId, newTreeTroncoId);\n      if (res.success && res.result?.request_url) {\n        openActionRequest(res.result.request_url);\n        setShowCreateTreeModal(false);\n        showToast('Solicitação de criação de árvore aberta no GitHub. Envie a issue para a Action validar e gravar nos JSONs.');\n      } else {\n        showToast('Erro: ' + (res.error || 'Não foi possível criar a solicitação da árvore.'));\n      }\n    } catch (e: any) {\n      showToast('Erro: ' + e.message);\n    }\n  };",
    "fix handleCreateTree online flow",
)

# -----------------------------------------------------------------------------
# 3) Expose admin tree actions in UI.
# -----------------------------------------------------------------------------
if "handleArchiveSelectedTree" not in app:
    app = must_replace(
        app,
        "  const handleToggleUserStatus = async (userId: number) => {",
        "  const openAdminOnlineAction = (res: any, successMessage: string) => {\n    if (res.success && res.result?.request_url) {\n      openActionRequest(res.result.request_url);\n      setAdminActionMessage('Solicitação online aberta no GitHub. Envie a issue para a Action validar e gravar a alteração nos JSONs.');\n      showToast(successMessage);\n      return;\n    }\n\n    const error = res.error || 'Não foi possível criar a solicitação administrativa.';\n    setAdminActionMessage(error);\n    showToast('Erro: ' + error);\n  };\n\n  const handleArchiveSelectedTree = async () => {\n    if (!adminTree) return;\n    if (adminTree.status !== 'active') {\n      showToast('Somente árvores ativas podem ser arquivadas.');\n      return;\n    }\n    if (!window.confirm(`Arquivar a árvore ${adminTree.tree_code}? O histórico será preservado.`)) return;\n\n    setAdminActionLoading(true);\n    setAdminActionMessage(null);\n    try {\n      const res = await dataStore.archiveTreeAction(adminTree.id, 'Arquivamento administrativo pelo painel');\n      openAdminOnlineAction(res, 'Solicitação de arquivamento aberta.');\n    } catch (e: any) {\n      setAdminActionMessage('Erro ao arquivar árvore: ' + e.message);\n      showToast('Erro: ' + e.message);\n    } finally {\n      setAdminActionLoading(false);\n    }\n  };\n\n  const handleAssignSelectedNode = async () => {\n    if (!adminTree || !selectedNode) return;\n    if (selectedNode.position_index === 0) {\n      showToast('O tronco não deve ser alterado por este atalho. Crie uma nova árvore com o tronco correto.');\n      return;\n    }\n\n    setAdminActionLoading(true);\n    setAdminActionMessage(null);\n    try {\n      const res = await dataStore.assignTreePositionAction(adminTree.id, selectedNode.position_index, adminSelectedUserId);\n      openAdminOnlineAction(res, `Solicitação para atribuir/mover membro à posição #${selectedNode.position_index} aberta.`);\n    } catch (e: any) {\n      setAdminActionMessage('Erro ao atribuir membro: ' + e.message);\n      showToast('Erro: ' + e.message);\n    } finally {\n      setAdminActionLoading(false);\n    }\n  };\n\n  const handleClearSelectedNode = async () => {\n    if (!adminTree || !selectedNode) return;\n    if (selectedNode.position_index === 0) {\n      showToast('O tronco não pode ser liberado por este atalho.');\n      return;\n    }\n    if (selectedNode.status !== 'occupied') {\n      showToast('Esta posição já está vaga.');\n      return;\n    }\n    if (!window.confirm(`Liberar a posição #${selectedNode.position_index}?`)) return;\n\n    setAdminActionLoading(true);\n    setAdminActionMessage(null);\n    try {\n      const res = await dataStore.clearTreePositionAction(adminTree.id, selectedNode.position_index);\n      openAdminOnlineAction(res, `Solicitação para liberar a posição #${selectedNode.position_index} aberta.`);\n    } catch (e: any) {\n      setAdminActionMessage('Erro ao liberar posição: ' + e.message);\n      showToast('Erro: ' + e.message);\n    } finally {\n      setAdminActionLoading(false);\n    }\n  };\n\n  const handleToggleUserStatus = async (userId: number) => {",
        "insert admin tree action handlers",
    )

if "activeAssignableUsers" not in app:
    app = must_replace(
        app,
        "const allUsers: User[] = systemState?.users || [];",
        "const allUsers: User[] = systemState?.users || [];\n  const activeAssignableUsers = allUsers.filter(u => u.status === 'active' && u.role !== 'admin');",
        "activeAssignableUsers helper",
    )

# Hide duplicated top role/view switcher. Bottom bar remains canonical.
app = app.replace(
    "<div className=\"flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]\">",
    "<div className=\"hidden\">",
    1,
)

# Ensure direct login exits landing and persists panel state.
app = app.replace(
    "setCurrentUser(u);\n                      setIsLocked(false);\n                      setCurrentView(u.role === 'admin' ? 'admin' : 'member');",
    "setCurrentUser(u);\n                      setIsLocked(false);\n                      setShowLandingPage(false);\n                      setCurrentView(u.role === 'admin' ? 'admin' : 'member');",
    1,
)

# Tree action panel inside admin tree explorer.
if "Ações administrativas da árvore" not in app:
    app = must_replace(
        app,
        "                      <div className=\"flex items-center justify-between text-xs\">\n                        <span className=\"font-bold text-slate-200\">\n                          Explorador da Árvore: <span className=\"text-amber-400 font-mono\">{adminTree.tree_code}</span>\n                        </span>\n                        <span className=\"text-[10px] text-slate-400 font-mono\">15 Posições</span>\n                      </div>\n                      {renderActiveModel(adminTreePositions)}",
        "                      <div className=\"flex items-center justify-between text-xs\">\n                        <span className=\"font-bold text-slate-200\">\n                          Explorador da Árvore: <span className=\"text-amber-400 font-mono\">{adminTree.tree_code}</span>\n                        </span>\n                        <span className=\"text-[10px] text-slate-400 font-mono\">15 Posições</span>\n                      </div>\n\n                      <div className=\"p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs\">\n                        <div className=\"font-bold text-slate-200 flex items-center gap-1.5\">\n                          <Shield className=\"w-3.5 h-3.5 text-amber-400\" />\n                          <span>Ações administrativas da árvore</span>\n                        </div>\n                        <div className=\"grid grid-cols-1 gap-2\">\n                          <button\n                            type=\"button\"\n                            onClick={() => fetchState(true)}\n                            className=\"w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-2 transition\"\n                          >\n                            <RefreshCw className=\"w-3.5 h-3.5\" />\n                            <span>Recarregar JSON</span>\n                          </button>\n                          <button\n                            type=\"button\"\n                            disabled={adminActionLoading || adminTree.status !== 'active'}\n                            onClick={handleArchiveSelectedTree}\n                            className=\"w-full py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 disabled:opacity-50 border border-rose-800 text-rose-200 font-bold flex items-center justify-center gap-2 transition\"\n                          >\n                            <Lock className=\"w-3.5 h-3.5\" />\n                            <span>{adminTree.status === 'active' ? 'Arquivar árvore' : `Status: ${adminTree.status}`}</span>\n                          </button>\n                        </div>\n                        {adminActionMessage && (\n                          <div className=\"p-2 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 leading-relaxed\">\n                            {adminActionMessage}\n                          </div>\n                        )}\n                      </div>\n\n                      {renderActiveModel(adminTreePositions)}",
        "insert admin tree action panel",
    )

# Node inspector actions.
if "Ações da posição" not in app:
    app = must_replace(
        app,
        "            <div className=\"p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between\">\n              <div>\n                <span className=\"text-[10px] text-slate-400 block\">Participante Ocupante:</span>\n                <span className=\"font-semibold text-slate-200\">\n                  {selectedNode.status === 'occupied'\n                    ? `${selectedNode.full_name || selectedNode.username} (@${selectedNode.username})`\n                    : 'Vaga Aberta'}\n                </span>\n              </div>\n              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${\n                selectedNode.status === 'occupied' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'\n              }`}>\n                {selectedNode.status === 'occupied' ? 'Ocupada' : 'Disponível'}\n              </span>\n            </div>",
        "            <div className=\"p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between\">\n              <div>\n                <span className=\"text-[10px] text-slate-400 block\">Participante Ocupante:</span>\n                <span className=\"font-semibold text-slate-200\">\n                  {selectedNode.status === 'occupied'\n                    ? `${selectedNode.full_name || selectedNode.username} (@${selectedNode.username})`\n                    : 'Vaga Aberta'}\n                </span>\n              </div>\n              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${\n                selectedNode.status === 'occupied' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'\n              }`}>\n                {selectedNode.status === 'occupied' ? 'Ocupada' : 'Disponível'}\n              </span>\n            </div>\n\n            {currentView === 'admin' && currentUser?.role === 'admin' && adminTab === 'global_trees' && adminTree && (\n              <div className=\"p-2.5 bg-slate-950 rounded-xl border border-amber-900/60 text-xs space-y-2\">\n                <div className=\"font-bold text-amber-300 flex items-center gap-1.5\">\n                  <Shield className=\"w-3.5 h-3.5\" />\n                  <span>Ações da posição</span>\n                </div>\n\n                {selectedNode.position_index === 0 ? (\n                  <div className=\"text-[11px] text-slate-400 leading-relaxed\">\n                    O tronco não deve ser removido ou movido por este painel. Para alterar tronco, crie uma nova árvore com o membro correto.\n                  </div>\n                ) : (\n                  <>\n                    <select\n                      value={adminSelectedUserId}\n                      onChange={(e) => setAdminSelectedUserId(parseInt(e.target.value))}\n                      className=\"w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-500\"\n                    >\n                      {activeAssignableUsers.map(user => (\n                        <option key={user.id} value={user.id}>\n                          {user.full_name || user.username} (@{user.username})\n                        </option>\n                      ))}\n                    </select>\n\n                    <div className=\"grid grid-cols-1 gap-2\">\n                      <button\n                        type=\"button\"\n                        disabled={adminActionLoading || activeAssignableUsers.length === 0}\n                        onClick={handleAssignSelectedNode}\n                        className=\"w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black transition flex items-center justify-center gap-2\"\n                      >\n                        <UserCheck className=\"w-3.5 h-3.5\" />\n                        <span>Escolher / mover para esta posição</span>\n                      </button>\n\n                      {selectedNode.status === 'occupied' && (\n                        <button\n                          type=\"button\"\n                          disabled={adminActionLoading}\n                          onClick={handleClearSelectedNode}\n                          className=\"w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold transition flex items-center justify-center gap-2\"\n                        >\n                          <Unlock className=\"w-3.5 h-3.5\" />\n                          <span>Liberar posição</span>\n                        </button>\n                      )}\n                    </div>\n                  </>\n                )}\n              </div>\n            )}",
        "insert selected node admin actions",
    )

# -----------------------------------------------------------------------------
# 4) Keep CSS policy, but mark it as breakpoint parity fallback instead of audit.
# -----------------------------------------------------------------------------
css = CSS.read_text(encoding="utf-8")
if "ARBORIS visual policy" in css and "fallback" not in css.split("\n", 8)[1:8]:
    css = css.replace(
        "  ARBORIS visual policy: mobile is the canonical layout.",
        "  ARBORIS visual policy fallback: mobile is the canonical layout.",
        1,
    )

if app != original_app:
    APP.write_text(app, encoding="utf-8")

if css != CSS.read_text(encoding="utf-8"):
    CSS.write_text(css, encoding="utf-8")

print("Applied pending UI fixes." if app != original_app else "Pending UI fixes already applied.")
