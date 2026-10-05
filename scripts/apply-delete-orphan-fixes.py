from pathlib import Path

REPO = Path('.')

def read(path: str) -> str:
    return (REPO / path).read_text()

def write(path: str, content: str) -> None:
    (REPO / path).write_text(content)

def must_replace(content: str, old: str, new: str, path: str, label: str) -> str:
    if old not in content:
        raise SystemExit(f'{path}: missing expected block for {label}')
    return content.replace(old, new, 1)

# src/services/adminGameEngine.ts
path = 'src/services/adminGameEngine.ts'
s = read(path)
s = must_replace(
    s,
    "export function assignTreePositionByAdmin(\n",
    "export function deleteTreeByAdmin(\n"
    "  originalState: GameDatabaseState,\n"
    "  params: {\n"
    "    treeId: number;\n"
    "    actor: AdminActor;\n"
    "    idempotencyKey: string;\n"
    "  }\n"
    "): AdminActionResult<{ treeId: number; affectedUserIds: number[]; nextTreeId: number | null }> {\n"
    "  const state = deepClone(originalState);\n"
    "  const now = nowIso();\n\n"
    "  const adminError = assertAdmin(state, params.actor);\n"
    "  if (adminError) return { success: false, state: originalState, error: adminError };\n"
    "  if (hasConsumedIdempotencyKey(state, params.idempotencyKey)) {\n"
    "    return { success: false, state: originalState, error: 'Operação administrativa já processada.' };\n"
    "  }\n\n"
    "  const tree = state.trees.find(item => item.id === params.treeId);\n"
    "  if (!tree) return { success: false, state: originalState, error: 'Árvore não encontrada.' };\n\n"
    "  const affectedUserIds = Array.from(new Set(tree.positions.filter(pos => pos.userId).map(pos => pos.userId as number)));\n"
    "  for (const user of state.users) {\n"
    "    if (affectedUserIds.includes(user.id) && user.currentTreeId === tree.id) {\n"
    "      user.currentTreeId = null;\n"
    "      user.currentPositionIndex = null;\n"
    "      user.updatedAt = now;\n"
    "    }\n"
    "  }\n\n"
    "  state.referrals = state.referrals.filter(ref => ref.treeId !== tree.id);\n"
    "  state.ledger = state.ledger.filter(entry => entry.treeId !== tree.id);\n"
    "  state.trees = state.trees.filter(item => item.id !== tree.id);\n"
    "  const nextTreeId = state.trees[0]?.id ?? null;\n\n"
    "  appendAudit(state, params.actor, 'ADMIN_TREE_DELETED', 'tree', tree.id, {\n"
    "    idempotencyKey: params.idempotencyKey,\n"
    "    treeCode: tree.treeCode,\n"
    "    affectedUserIds,\n"
    "    deletedAt: now,\n"
    "    githubActor: params.actor.githubActor || null\n"
    "  });\n\n"
    "  return { success: true, state, result: { treeId: tree.id, affectedUserIds, nextTreeId } };\n"
    "}\n\n"
    "export function deleteUserByAdmin(\n"
    "  originalState: GameDatabaseState,\n"
    "  params: {\n"
    "    userId: number;\n"
    "    actor: AdminActor;\n"
    "    idempotencyKey: string;\n"
    "  }\n"
    "): AdminActionResult<{ userId: number; username: string; affectedTreeIds: number[] }> {\n"
    "  const state = deepClone(originalState);\n"
    "  const now = nowIso();\n\n"
    "  const adminError = assertAdmin(state, params.actor);\n"
    "  if (adminError) return { success: false, state: originalState, error: adminError };\n"
    "  if (hasConsumedIdempotencyKey(state, params.idempotencyKey)) {\n"
    "    return { success: false, state: originalState, error: 'Operação administrativa já processada.' };\n"
    "  }\n\n"
    "  const target = state.users.find(user => user.id === params.userId);\n"
    "  if (!target) return { success: false, state: originalState, error: 'Usuário não encontrado.' };\n"
    "  if (target.role === 'admin') return { success: false, state: originalState, error: 'Coordenador/admin não pode ser excluído por este painel.' };\n\n"
    "  const trunkTrees = state.trees.filter(tree => tree.troncoUserId === target.id);\n"
    "  if (trunkTrees.length > 0) {\n"
    "    return { success: false, state: originalState, error: 'Este usuário é tronco de árvore. Exclua a árvore antes de excluir o membro.' };\n"
    "  }\n\n"
    "  const affectedTreeIds: number[] = [];\n"
    "  for (const tree of state.trees) {\n"
    "    let touched = false;\n"
    "    for (const position of tree.positions) {\n"
    "      if (position.userId === target.id) {\n"
    "        position.userId = null;\n"
    "        position.status = 'vacant';\n"
    "        position.occupiedAt = null;\n"
    "        position.username = null;\n"
    "        position.name = null;\n"
    "        touched = true;\n"
    "      }\n"
    "    }\n"
    "    if (touched) affectedTreeIds.push(tree.id);\n"
    "  }\n\n"
    "  state.referrals = state.referrals.filter(ref => ref.referrerUserId !== target.id && ref.referredUserId !== target.id);\n"
    "  state.ledger = state.ledger.filter(entry => entry.fromUserId !== target.id && entry.toUserId !== target.id);\n"
    "  state.wallets = state.wallets.filter(wallet => wallet.userId !== target.id);\n"
    "  state.users = state.users.filter(user => user.id !== target.id);\n\n"
    "  appendAudit(state, params.actor, 'ADMIN_USER_DELETED', 'user', target.id, {\n"
    "    idempotencyKey: params.idempotencyKey,\n"
    "    username: target.username,\n"
    "    name: target.name,\n"
    "    affectedTreeIds,\n"
    "    deletedAt: now,\n"
    "    githubActor: params.actor.githubActor || null\n"
    "  });\n\n"
    "  return { success: true, state, result: { userId: target.id, username: target.username, affectedTreeIds } };\n"
    "}\n\n"
    "export function assignTreePositionByAdmin(\n",
    path,
    'insert hard delete actions'
)
write(path, s)

# server/actions.ts
path = 'server/actions.ts'
s = read(path)
s = must_replace(s, "import { createTreeByAdmin, archiveTreeByAdmin, assignTreePositionByAdmin, clearTreePositionByAdmin } from '../src/services/adminGameEngine';",
                 "import { createTreeByAdmin, archiveTreeByAdmin, deleteTreeByAdmin, deleteUserByAdmin, assignTreePositionByAdmin, clearTreePositionByAdmin } from '../src/services/adminGameEngine';", path, 'admin imports')
s = must_replace(s, "  z.object({ action: z.literal('archive_tree'), params: z.object({ treeId: id, reason: z.string().trim().max(500).optional() }).strict() }),\n",
                 "  z.object({ action: z.literal('archive_tree'), params: z.object({ treeId: id, reason: z.string().trim().max(500).optional() }).strict() }),\n  z.object({ action: z.literal('delete_tree'), params: z.object({ treeId: id }).strict() }),\n  z.object({ action: z.literal('delete_user'), params: z.object({ userId: id }).strict() }),\n", path, 'action schema')
s = must_replace(s, "    case 'archive_tree': return archiveTreeByAdmin(state, { ...input.params, actor, idempotencyKey: key });\n",
                 "    case 'archive_tree': return archiveTreeByAdmin(state, { ...input.params, actor, idempotencyKey: key });\n    case 'delete_tree': return deleteTreeByAdmin(state, { ...input.params, actor, idempotencyKey: key });\n    case 'delete_user': return deleteUserByAdmin(state, { ...input.params, actor, idempotencyKey: key });\n", path, 'action switch')
write(path, s)

# src/services/directAdminActions.ts
path = 'src/services/directAdminActions.ts'
s = read(path)
s = must_replace(s, "export function archiveTreeDirect({ treeId, reason }: { treeId: number; reason?: string } & ActorParams) {\n  return apiMutation('/actions', { action: 'archive_tree', params: { treeId, reason } });\n}\n",
                 "export function archiveTreeDirect({ treeId, reason }: { treeId: number; reason?: string } & ActorParams) {\n  return apiMutation('/actions', { action: 'archive_tree', params: { treeId, reason } });\n}\nexport function deleteTreeDirect({ treeId }: { treeId: number } & ActorParams) {\n  return apiMutation('/actions', { action: 'delete_tree', params: { treeId } });\n}\nexport function deleteUserDirect({ userId }: { userId: number } & ActorParams) {\n  return apiMutation('/actions', { action: 'delete_user', params: { userId } });\n}\n", path, 'direct delete helpers')
write(path, s)

# server/db.ts
path = 'server/db.ts'
s = read(path)
s = must_replace(s, "export async function saveState(db: PoolConnection, state: GameDatabaseState, previous?: GameDatabaseState) {\n",
                 "async function executeForIds(db: PoolConnection, sqlPrefix: string, ids: number[], sqlSuffix = '') {\n  if (!ids.length) return;\n  await db.execute(`${sqlPrefix} (${ids.map(() => '?').join(',')})${sqlSuffix}`, ids);\n}\n\nasync function deleteRemovedRows(db: PoolConnection, state: GameDatabaseState, previous: GameDatabaseState) {\n  const nextTreeIds = new Set(state.trees.map(tree => tree.id));\n  const removedTreeIds = previous.trees.filter(tree => !nextTreeIds.has(tree.id)).map(tree => tree.id);\n  if (removedTreeIds.length) {\n    await executeForIds(db, 'DELETE FROM tree_positions WHERE treeId IN', removedTreeIds);\n    await executeForIds(db, 'DELETE FROM referrals WHERE treeId IN', removedTreeIds);\n    await executeForIds(db, 'DELETE FROM ledger WHERE treeId IN', removedTreeIds);\n    await executeForIds(db, 'DELETE FROM trees WHERE id IN', removedTreeIds);\n  }\n\n  const nextUserIds = new Set(state.users.map(user => user.id));\n  const removedUserIds = previous.users.filter(user => !nextUserIds.has(user.id)).map(user => user.id);\n  if (removedUserIds.length) {\n    await executeForIds(db, 'DELETE FROM sessions WHERE userId IN', removedUserIds);\n    await executeForIds(db, 'DELETE FROM credentials WHERE userId IN', removedUserIds);\n    await executeForIds(db, 'DELETE FROM wallets WHERE userId IN', removedUserIds);\n    const placeholders = removedUserIds.map(() => '?').join(',');\n    await db.execute(`DELETE FROM referrals WHERE referrerUserId IN (${placeholders}) OR referredUserId IN (${placeholders})`, [...removedUserIds, ...removedUserIds]);\n    await db.execute(`DELETE FROM ledger WHERE fromUserId IN (${placeholders}) OR toUserId IN (${placeholders})`, [...removedUserIds, ...removedUserIds]);\n    await executeForIds(db, \"UPDATE tree_positions SET userId=NULL,status='vacant',occupiedAt=NULL,username=NULL,name=NULL WHERE userId IN\", removedUserIds);\n    await executeForIds(db, 'DELETE FROM users WHERE id IN', removedUserIds);\n  }\n}\n\nexport async function saveState(db: PoolConnection, state: GameDatabaseState, previous?: GameDatabaseState) {\n", path, 'delete helper')
s = must_replace(s, "  for (const [key, table, primary, fields] of descriptors) {\n",
                 "  if (previous) await deleteRemovedRows(db, state, previous);\n  for (const [key, table, primary, fields] of descriptors) {\n", path, 'call delete helper')
write(path, s)

# src/App.tsx
path = 'src/App.tsx'
s = read(path)
s = must_replace(s, "  archiveTreeDirect,\n  assignPositionDirect,\n  clearPositionDirect,\n  createTreeDirect,\n  createUserDirect\n} from './services/directAdminActions';",
                 "  archiveTreeDirect,\n  assignPositionDirect,\n  clearPositionDirect,\n  createTreeDirect,\n  createUserDirect,\n  deleteTreeDirect,\n  deleteUserDirect\n} from './services/directAdminActions';", path, 'direct imports')
s = s.replace("adminTab?: 'global_trees' | 'create_user' | 'members' | 'settings' | 'audit';", "adminTab?: 'global_trees' | 'create_user' | 'members' | 'orphans' | 'settings' | 'audit';")
s = s.replace("const [adminTab, setAdminTab] = useState<'global_trees' | 'create_user' | 'members' | 'settings' | 'audit'>(() => {", "const [adminTab, setAdminTab] = useState<'global_trees' | 'create_user' | 'members' | 'orphans' | 'settings' | 'audit'>(() => {")
s = s.replace("    return stored === 'global_trees' || stored === 'create_user' || stored === 'settings' ? stored : 'global_trees';", "    return stored === 'global_trees' || stored === 'create_user' || stored === 'orphans' || stored === 'settings' ? stored : 'global_trees';")

insert_after_archive = """  const handleArchiveSelectedTree = async () => {
    if (!adminTree) return;
    if (adminTree.status !== 'active') {
      showToast('Somente árvores ativas podem ser arquivadas.');
      return;
    }
    if (!window.confirm(`Arquivar a árvore ${adminTree.tree_code}? O histórico será preservado.`)) return;

    setAdminActionLoading(true);
    setAdminActionMessage(null);
    try {
      const res = await archiveTreeDirect({
        treeId: adminTree.id,
        reason: 'Arquivamento administrativo pelo painel',
        actorUserId: currentUser?.id,
        actorUsername: currentUser?.username
      });
      await openAdminOnlineAction(res, 'Árvore arquivada e salva no banco de dados.');
    } catch (e: any) {
      setAdminActionMessage('Erro ao arquivar árvore: ' + e.message);
      showToast('Erro: ' + e.message);
    } finally {
      setAdminActionLoading(false);
    }
  };
"""
insert_with_delete = insert_after_archive + """
  const handleDeleteSelectedTree = async () => {
    if (!adminTree) return;
    const affectedCount = adminTreePositions.filter(pos => pos.status === 'occupied' && pos.user_id !== null).length;
    if (!window.confirm(`Excluir definitivamente a árvore ${adminTree.tree_code}? ${affectedCount} membro(s) ficarão sem posição nesta árvore.`)) return;
    if (!window.confirm('Confirma a exclusão definitiva? Essa ação remove a árvore do banco de dados.')) return;

    setAdminActionLoading(true);
    setAdminActionMessage(null);
    try {
      const res = await deleteTreeDirect({
        treeId: adminTree.id,
        actorUserId: currentUser?.id,
        actorUsername: currentUser?.username
      });
      if (res.success) {
        const nextTreeId = res.result?.nextTreeId;
        await applyDirectAdminState(res);
        setSelectedNode(null);
        if (nextTreeId) setSelectedAdminTreeId(nextTreeId);
        setAdminActionMessage('Árvore excluída definitivamente. Os membros afetados ficaram sem posição nesta árvore.');
        showToast('Árvore excluída definitivamente.');
      } else {
        const error = res.error || 'Não foi possível excluir a árvore.';
        setAdminActionMessage(error);
        showToast('Erro: ' + error);
      }
    } catch (e: any) {
      setAdminActionMessage('Erro ao excluir árvore: ' + e.message);
      showToast('Erro: ' + e.message);
    } finally {
      setAdminActionLoading(false);
    }
  };
"""
s = must_replace(s, insert_after_archive, insert_with_delete, path, 'delete tree handler')

old_toggle = """  const handleToggleUserStatus = async (userId: number) => {
    try {
      const res = await dataStore.toggleUserStatusAction(userId);
      if (res.success) {
        showToast(`✓ Status atualizado para: ${res.newStatus}`);
        await fetchState();
      } else {
        showToast('Erro: ' + res.error);
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    }
  };
"""
new_delete_user = """  const handleDeleteUser = async (userId: number, label: string) => {
    if (!window.confirm(`Excluir definitivamente o membro ${label}?`)) return;
    if (!window.confirm('Confirma a exclusão definitiva? Essa ação remove o membro do banco de dados.')) return;
    setAdminActionLoading(true);
    try {
      const res = await deleteUserDirect({
        userId,
        actorUserId: currentUser?.id,
        actorUsername: currentUser?.username
      });
      if (res.success) {
        await applyDirectAdminState(res);
        setAdminActionMessage('Membro excluído definitivamente.');
        showToast('Membro excluído definitivamente.');
      } else {
        const error = res.error || 'Não foi possível excluir o membro.';
        setAdminActionMessage(error);
        showToast('Erro: ' + error);
      }
    } catch (e: any) {
      setAdminActionMessage('Erro ao excluir membro: ' + e.message);
      showToast('Erro: ' + e.message);
    } finally {
      setAdminActionLoading(false);
    }
  };
"""
s = must_replace(s, old_toggle, new_delete_user, path, 'replace status toggle with delete')

s = must_replace(s, "  const activeAssignableUsers = allUsers.filter(u => u.status === 'active' && u.role !== 'admin');\n  const allLinks: ReferralLink[] = systemState?.referral_links || [];\n",
                 "  const activeAssignableUsers = allUsers.filter(u => u.status === 'active' && u.role !== 'admin');\n  const positionedUserIds = new Set(allPositions.filter(p => p.status === 'occupied' && p.user_id !== null).map(p => p.user_id as number));\n  const orphanUsers = allUsers.filter(u => u.role !== 'admin' && !positionedUserIds.has(u.id));\n  const allLinks: ReferralLink[] = systemState?.referral_links || [];\n", path, 'orphan collections')

s = must_replace(s, """                <button
                  onClick={() => setAdminTab('settings')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 ${
                    adminTab === 'settings' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Regras</span>
                </button>
""",
"""                <button
                  onClick={() => setAdminTab('orphans')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 ${
                    adminTab === 'orphans' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Órfãos</span>
                </button>

                <button
                  onClick={() => setAdminTab('settings')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 ${
                    adminTab === 'settings' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Regras</span>
                </button>
""", path, 'orphans tab button')

s = must_replace(s, """                          <button
                            type="button"
                            disabled={adminActionLoading || adminTree.status !== 'active'}
                            onClick={handleArchiveSelectedTree}
                            className="w-full py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 disabled:opacity-50 border border-rose-800 text-rose-200 font-bold flex items-center justify-center gap-2 transition"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>{adminTree.status === 'active' ? 'Arquivar árvore' : `Status: ${adminTree.status}`}</span>
                          </button>
""",
"""                          <button
                            type="button"
                            disabled={adminActionLoading || adminTree.status !== 'active'}
                            onClick={handleArchiveSelectedTree}
                            className="w-full py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 disabled:opacity-50 border border-rose-800 text-rose-200 font-bold flex items-center justify-center gap-2 transition"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>{adminTree.status === 'active' ? 'Arquivar árvore' : `Status: ${adminTree.status}`}</span>
                          </button>
                          <button
                            type="button"
                            disabled={adminActionLoading}
                            onClick={handleDeleteSelectedTree}
                            className="w-full py-2 rounded-xl bg-red-950/80 hover:bg-red-900 disabled:opacity-50 border border-red-800 text-red-200 font-bold flex items-center justify-center gap-2 transition"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Excluir árvore definitivamente</span>
                          </button>
""", path, 'delete tree button')

s = s.replace("Membros Cadastrados ({allUsers.length})", "Membros Cadastrados ({allUsers.filter(u => u.role !== 'admin').length})")
s = s.replace("{allUsers.map(user => (", "{allUsers.filter(user => user.role !== 'admin').map(user => (")
s = must_replace(s, """                              <button
                                onClick={() => handleToggleUserStatus(user.id)}
                                className="text-slate-400 hover:text-white underline"
                              >
                                {user.status === 'active' ? 'Suspender Membro' : 'Ativar Membro'}
                              </button>
""",
"""                              <button
                                disabled={adminActionLoading}
                                onClick={() => handleDeleteUser(user.id, user.full_name || `@${user.username}`)}
                                className="text-rose-400 hover:text-rose-200 underline disabled:opacity-50"
                              >
                                Excluir definitivamente
                              </button>
""", path, 'replace member status action')

orphans_block = """              {/* SUB-TAB: REGRAS */}
              {adminTab === 'settings' && (
"""
orphans_insert = """              {/* SUB-TAB: ÓRFÃOS */}
              {adminTab === 'orphans' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-400" />
                      <span>Membros órfãos</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Membros sem posição em nenhuma árvore ativa ou cadastrada.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {orphanUsers.length === 0 ? (
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
                        Nenhum membro órfão encontrado.
                      </div>
                    ) : orphanUsers.map(user => (
                      <div key={user.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-100">{user.full_name || user.username}</div>
                            <div className="text-[10px] text-slate-400">@{user.username}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded font-mono bg-slate-950 text-amber-300 border border-amber-800 text-[10px]">
                            sem árvore
                          </span>
                        </div>
                        <button
                          disabled={adminActionLoading}
                          onClick={() => handleDeleteUser(user.id, user.full_name || `@${user.username}`)}
                          className="w-full py-2 rounded-xl bg-red-950/70 hover:bg-red-900 disabled:opacity-50 border border-red-800 text-red-200 font-bold transition"
                        >
                          Excluir definitivamente
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

""" + orphans_block
s = must_replace(s, orphans_block, orphans_insert, path, 'orphans content')

write(path, s)
print('Applied delete/orphan fixes')
