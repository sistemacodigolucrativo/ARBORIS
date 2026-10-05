from pathlib import Path
import re

ROOT = Path('.')


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content)


def replace_once(content: str, old: str, new: str, path: str, label: str) -> str:
    if old not in content:
        raise SystemExit(f'{path}: missing expected block for {label}')
    return content.replace(old, new, 1)


def replace_all(content: str, old: str, new: str) -> str:
    return content.replace(old, new)

# -----------------------------------------------------------------------------
# Types
# -----------------------------------------------------------------------------
path = 'src/types/game.ts'
s = read(path)
s = replace_all(s, "export type LedgerEntryType = 'CONCESSAO_INICIAL_SEMENTES' | 'FORTALECIMENTO_TRONCO' | 'AJUSTE_ADMINISTRATIVO';",
                "export type LedgerEntryType = 'CONCESSAO_INICIAL_SEMENTES' | 'FORTALECIMENTO_TRONCO' | 'RESERVA_VAGA' | 'AJUSTE_ADMINISTRATIVO';")
s = replace_all(s, "  treeCode: string;\n  troncoUserId: number;", "  treeCode: string;\n  nickname?: string | null;\n  troncoUserId: number;")
write(path, s)

# -----------------------------------------------------------------------------
# Migrations / DB mapping
# -----------------------------------------------------------------------------
path = 'server/migrations/001_initial.sql'
s = read(path)
s = replace_all(s, "id INT PRIMARY KEY, categoryId INT NOT NULL, treeCode VARCHAR(100) NOT NULL UNIQUE,\n troncoUserId", "id INT PRIMARY KEY, categoryId INT NOT NULL, treeCode VARCHAR(100) NOT NULL UNIQUE,\n nickname VARCHAR(120) NULL, troncoUserId")
write(path, s)

mig = ROOT / 'server/migrations/002_tree_nickname.sql'
if not mig.exists():
    mig.write_text("ALTER TABLE trees ADD COLUMN IF NOT EXISTS nickname VARCHAR(120) NULL AFTER treeCode;\n")

path = 'server/db.ts'
s = read(path)
s = replace_all(s, "['trees','trees','id','id categoryId treeCode troncoUserId status cycleNumber parentTreeId createdAt completedAt'],",
                "['trees','trees','id','id categoryId treeCode nickname troncoUserId status cycleNumber parentTreeId createdAt completedAt'],")
write(path, s)

# -----------------------------------------------------------------------------
# Game engine: 50 initial seeds, reserve-vaga action, allow later tronco transfer
# -----------------------------------------------------------------------------
path = 'src/services/gameEngine.ts'
s = read(path)
s = replace_once(s,
"  const targetTree = refCheck.tree;\n  const initialGrant = state.config.initialSeedsGrant || 25;",
"  const targetTree = refCheck.tree;\n  const category = state.config.categories.find(c => c.id === targetTree.categoryId);\n  const reservationAmount = category?.tokenRequirement || state.config.initialSeedsGrant || 25;\n  const initialGrant = reservationAmount * 2;",
path, 'initial grant rule')
s = replace_all(s, "initialSeeds: initialGrant", "initialSeeds: initialGrant,\n      reservationSeeds: reservationAmount")
s = replace_all(s, "tokensGranted: initialGrant,", "tokensGranted: initialGrant,")

reserve_fn = r'''
/**
 * Reserves the next external position by consuming the first package of seeds.
 * These seeds are burned/consumed by the system and are not transferred to the tronco.
 */
export function reserveTreeEntry(
  originalState: GameDatabaseState,
  params: {
    userId: number;
    treeId: number;
    idempotencyKey?: string;
  }
): ActionResult<{ positionIndex: number; amountConsumed: number }> {
  const state = deepClone(originalState);
  const now = nowIso();

  const user = state.users.find(u => u.id === params.userId && u.status === 'active');
  if (!user) return { success: false, state: originalState, error: 'Participante não encontrado ou inativo.' };

  const tree = state.trees.find(t => t.id === params.treeId && t.status === 'active');
  if (!tree) return { success: false, state: originalState, error: 'Árvore comunitária não encontrada ou já concluída.' };

  const alreadyInTree = tree.positions.some(p => p.userId === user.id && p.status === 'occupied');
  if (alreadyInTree) return { success: false, state: originalState, error: 'Sua vaga nesta árvore já está reservada.' };

  const category = state.config.categories.find(c => c.id === tree.categoryId);
  if (!category || !category.tokenRequirement || category.tokenRequirement <= 0) {
    return { success: false, state: originalState, error: 'Configuração da categoria inválida ou corrompida.' };
  }
  const requiredAmount = category.tokenRequirement;

  const vacantPos = findNextVacantPosition(tree);
  if (!vacantPos) return { success: false, state: originalState, error: 'Esta árvore já está sem vagas externas.' };

  const wallet = state.wallets.find(w => w.userId === user.id);
  if (!wallet || wallet.balance < requiredAmount) {
    return { success: false, state: originalState, error: `Saldo insuficiente para reservar vaga. Necessário: ${requiredAmount} sementes.` };
  }

  const idempotencyKey = params.idempotencyKey || `reserve_${user.id}_tree${tree.id}_pos${vacantPos.index}_${Date.now()}`;
  if (!validateIdempotency(state, idempotencyKey)) {
    return { success: false, state: originalState, error: 'Reserva já processada anteriormente.' };
  }

  wallet.balance -= requiredAmount;
  wallet.updatedAt = now;

  const targetPos = tree.positions.find(p => p.index === vacantPos.index)!;
  targetPos.status = 'occupied';
  targetPos.userId = user.id;
  targetPos.username = user.username;
  targetPos.name = user.name;
  targetPos.occupiedAt = now;

  user.currentTreeId = tree.id;
  user.currentPositionIndex = targetPos.index;
  user.updatedAt = now;

  const nextAuditId = Math.max(0, ...state.auditLog.map(a => a.id)) + 1;
  state.auditLog.push({
    id: nextAuditId,
    actorUserId: user.id,
    action: 'TREE_POSITION_RESERVED',
    entity: 'tree_position',
    entityId: `${tree.id}_${targetPos.index}`,
    metadata: {
      idempotencyKey,
      userId: user.id,
      treeId: tree.id,
      positionIndex: targetPos.index,
      amountConsumed: requiredAmount,
      note: 'Reserva de vaga: sementes consumidas pelo sistema, sem transferência ao tronco.'
    },
    actorUsername: user.username,
    createdAt: now
  });

  return { success: true, state, result: { positionIndex: targetPos.index, amountConsumed: requiredAmount } };
}

'''
s = replace_once(s, "/**\n * Strengthens the Tronco (atomic operation):", reserve_fn + "/**\n * Strengthens the Tronco (atomic operation):", path, 'insert reserveTreeEntry')
s = replace_once(s,
"  // Already in this tree?\n  const alreadyInTree = tree.positions.some(p => p.userId === user.id && p.status === 'occupied');\n  if (alreadyInTree) {\n    return { success: false, state: originalState, error: 'Você já ocupa uma posição ativa nesta árvore comunitária.' };\n  }",
"  // If the member already reserved a position in this tree, this action only sends the remaining seeds to the tronco.\n  const existingPosition = tree.positions.find(p => p.userId === user.id && p.status === 'occupied');\n  const alreadyInTree = Boolean(existingPosition);",
path, 'allow strengthen after reservation')
s = replace_once(s,
"  // Find next vacant external position (CRÍTICO 2)\n  const vacantPos = findNextVacantPosition(tree);\n  if (!vacantPos) {\n    return { success: false, state: originalState, error: 'Esta árvore comunitária já está com todas as vagas externas preenchidas.' };\n  }",
"  // Find next vacant external position only when the user has not reserved a position yet.\n  const vacantPos = existingPosition || findNextVacantPosition(tree);\n  if (!vacantPos) {\n    return { success: false, state: originalState, error: 'Esta árvore comunitária já está com todas as vagas externas preenchidas.' };\n  }",
path, 'conditional vacant position')
s = replace_once(s,
"  // Step 2: Occupy the position\n  const targetPos = tree.positions.find(p => p.index === vacantPos.index)!;",
"  if (alreadyInTree && existingPosition) {\n    const nextAuditId = Math.max(0, ...state.auditLog.map(a => a.id)) + 1;\n    state.auditLog.push({\n      id: nextAuditId,\n      actorUserId: user.id,\n      action: 'TREE_TRONCO_STRENGTHENED',\n      entity: 'tree',\n      entityId: tree.id,\n      metadata: {\n        userId: user.id,\n        treeId: tree.id,\n        positionIndex: existingPosition.index,\n        amount: requiredAmount\n      },\n      actorUsername: user.username,\n      createdAt: now\n    });\n    return { success: true, state, result: { positionIndex: existingPosition.index, bifurcated: false, newTrees: [] } };\n  }\n\n  // Step 2: Occupy the position\n  const targetPos = tree.positions.find(p => p.index === vacantPos.index)!;",
path, 'transfer only when already reserved')
write(path, s)

# -----------------------------------------------------------------------------
# Admin engine: nickname update action and nickname on new trees
# -----------------------------------------------------------------------------
path = 'src/services/adminGameEngine.ts'
s = read(path)
s = replace_all(s, "    treeCode,\n    troncoUserId", "    treeCode,\n    nickname: null,\n    troncoUserId")
update_nickname_fn = r'''
export function updateTreeNicknameByAdmin(
  originalState: GameDatabaseState,
  params: {
    treeId: number;
    nickname?: string;
    actor: AdminActor;
    idempotencyKey: string;
  }
): AdminActionResult<{ treeId: number; nickname: string | null }> {
  const state = deepClone(originalState);
  const now = nowIso();

  const adminError = assertAdmin(state, params.actor);
  if (adminError) return { success: false, state: originalState, error: adminError };
  if (hasConsumedIdempotencyKey(state, params.idempotencyKey)) {
    return { success: false, state: originalState, error: 'Operação administrativa já processada.' };
  }

  const tree = state.trees.find(item => item.id === params.treeId);
  if (!tree) return { success: false, state: originalState, error: 'Árvore não encontrada.' };

  const nickname = params.nickname?.trim().slice(0, 120) || null;
  tree.nickname = nickname;

  appendAudit(state, params.actor, 'ADMIN_TREE_NICKNAME_UPDATED', 'tree', tree.id, {
    idempotencyKey: params.idempotencyKey,
    nickname,
    updatedAt: now,
    githubActor: params.actor.githubActor || null
  });

  return { success: true, state, result: { treeId: tree.id, nickname } };
}

'''
s = replace_once(s, "export function assignTreePositionByAdmin(\n", update_nickname_fn + "export function assignTreePositionByAdmin(\n", path, 'insert nickname admin action')
write(path, s)

# -----------------------------------------------------------------------------
# Server actions
# -----------------------------------------------------------------------------
path = 'server/actions.ts'
s = read(path)
s = replace_all(s, "import { ActionResult, createParticipant, strengthenTronco, transferSeeds, validateReferral } from '../src/services/gameEngine';",
                "import { ActionResult, createParticipant, reserveTreeEntry, strengthenTronco, transferSeeds, validateReferral } from '../src/services/gameEngine';")
s = replace_all(s, "import { createTreeByAdmin, archiveTreeByAdmin, deleteTreeByAdmin, deleteUserByAdmin, assignTreePositionByAdmin, clearTreePositionByAdmin } from '../src/services/adminGameEngine';",
                "import { createTreeByAdmin, archiveTreeByAdmin, deleteTreeByAdmin, deleteUserByAdmin, updateTreeNicknameByAdmin, assignTreePositionByAdmin, clearTreePositionByAdmin } from '../src/services/adminGameEngine';")
s = replace_once(s,
"  z.object({ action: z.literal('delete_tree'), params: z.object({ treeId: id }).strict() }),\n  z.object({ action: z.literal('delete_user'), params: z.object({ userId: id }).strict() }),",
"  z.object({ action: z.literal('delete_tree'), params: z.object({ treeId: id }).strict() }),\n  z.object({ action: z.literal('delete_user'), params: z.object({ userId: id }).strict() }),\n  z.object({ action: z.literal('update_tree_nickname'), params: z.object({ treeId: id, nickname: z.string().trim().max(120).optional() }).strict() }),\n  z.object({ action: z.literal('reserve_tree_entry'), params: z.object({ treeId: id }).strict() }),",
path, 'action schema additions')
s = replace_all(s, "if (!['strengthen_tronco', 'transfer_seeds'].includes(input.action) && user.role !== 'admin')",
                "if (!['reserve_tree_entry', 'strengthen_tronco', 'transfer_seeds'].includes(input.action) && user.role !== 'admin')")
s = replace_once(s,
"    case 'delete_user': return deleteUserByAdmin(state, { ...input.params, actor, idempotencyKey: key });\n",
"    case 'delete_user': return deleteUserByAdmin(state, { ...input.params, actor, idempotencyKey: key });\n    case 'update_tree_nickname': return updateTreeNicknameByAdmin(state, { ...input.params, actor, idempotencyKey: key });\n    case 'reserve_tree_entry':\n      if (user.role === 'admin') throw new HttpError(403, 'Coordenador não participa deste fluxo.');\n      return reserveTreeEntry(state, { userId: user.id, treeId: input.params.treeId, idempotencyKey: key });\n",
path, 'switch additions')
s = replace_all(s, "      if (state.trees.some(t => t.status === 'active' && t.positions.some(p => p.userId === user.id && p.status === 'occupied'))) throw new HttpError(400, 'Você já ocupa uma posição em árvore ativa.');\n", "")
write(path, s)

# -----------------------------------------------------------------------------
# Direct admin / data store helpers
# -----------------------------------------------------------------------------
path = 'src/services/directAdminActions.ts'
s = read(path)
s = replace_once(s,
"export function deleteUserDirect({ userId }: { userId: number } & ActorParams) {\n  return apiMutation('/actions', { action: 'delete_user', params: { userId } });\n}\n",
"export function deleteUserDirect({ userId }: { userId: number } & ActorParams) {\n  return apiMutation('/actions', { action: 'delete_user', params: { userId } });\n}\nexport function updateTreeNicknameDirect({ treeId, nickname }: { treeId: number; nickname?: string } & ActorParams) {\n  return apiMutation('/actions', { action: 'update_tree_nickname', params: { treeId, nickname } });\n}\n",
path, 'nickname direct helper')
write(path, s)

path = 'src/services/dataStore.ts'
s = read(path)
s = replace_once(s,
"  async strengthenTroncoAction(_userId: number, treeId: number) {\n    return apiMutation('/actions', { action: 'strengthen_tronco', params: { treeId } });\n  }",
"  async reserveTreeEntryAction(treeId: number) {\n    return apiMutation('/actions', { action: 'reserve_tree_entry', params: { treeId } });\n  }\n  async strengthenTroncoAction(_userId: number, treeId: number) {\n    return apiMutation('/actions', { action: 'strengthen_tronco', params: { treeId } });\n  }",
path, 'reserve data store action')
s = replace_once(s,
"        tree_code: t.treeCode,\n        tronco_user_id: t.troncoUserId,",
"        tree_code: t.treeCode,\n        nickname: t.nickname || null,\n        display_name: t.nickname || cat?.name,\n        tronco_user_id: t.troncoUserId,",
path, 'formatted tree nickname')
write(path, s)

# -----------------------------------------------------------------------------
# App UI
# -----------------------------------------------------------------------------
path = 'src/App.tsx'
s = read(path)
s = replace_all(s, "  deleteTreeDirect,\n  deleteUserDirect", "  deleteTreeDirect,\n  deleteUserDirect,\n  updateTreeNicknameDirect")
s = replace_all(s, "  category_name?: string;\n  token_requirement?: number;", "  category_name?: string;\n  nickname?: string | null;\n  display_name?: string | null;\n  token_requirement?: number;")
s = replace_once(s,
"  const [adminActionLoading, setAdminActionLoading] = useState<boolean>(false);\n  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);",
"  const [adminActionLoading, setAdminActionLoading] = useState<boolean>(false);\n  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);\n  const [showAdminCreateMemberForm, setShowAdminCreateMemberForm] = useState<boolean>(false);\n  const [adminMembersPage, setAdminMembersPage] = useState<number>(1);\n  const [adminMembersPageSize, setAdminMembersPageSize] = useState<number>(10);",
path, 'admin member states')

reserve_handler = r'''
  const handleReserveTreeEntry = async (treeId: number) => {
    if (currentUser?.role === 'admin') {
      showToast('Ação bloqueada: coordenador não participa deste fluxo.');
      return;
    }
    setActivatingTronco(true);
    try {
      const res = await dataStore.reserveTreeEntryAction(treeId);
      if (res.success && res.result) {
        await fetchState(true);
        showToast('− 25 Sementes. Sua vaga na árvore está reservada.');
      } else {
        showToast('Falha: ' + (res.error || 'Não foi possível reservar sua vaga.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    } finally {
      setActivatingTronco(false);
    }
  };

'''
s = replace_once(s, "  // ATOMIC POSITION CLAIM & STRENGTHENING:", reserve_handler + "  // ATOMIC POSITION CLAIM & STRENGTHENING:", path, 'reserve handler')
s = replace_all(s, "showToast('Fortalecimento concluído.');", "showToast('25 sementes enviadas ao tronco.');")

nickname_handler = r'''
  const handleUpdateTreeNickname = async () => {
    if (!adminTree) return;
    const currentNickname = adminTree.nickname || '';
    const nickname = window.prompt('Digite o apelido da árvore. Deixe vazio para remover o apelido.', currentNickname);
    if (nickname === null) return;
    setAdminActionLoading(true);
    setAdminActionMessage(null);
    try {
      const res = await updateTreeNicknameDirect({
        treeId: adminTree.id,
        nickname,
        actorUserId: currentUser?.id,
        actorUsername: currentUser?.username
      });
      await openAdminOnlineAction(res, nickname.trim() ? 'Apelido da árvore atualizado.' : 'Apelido da árvore removido.');
    } catch (e: any) {
      setAdminActionMessage('Erro ao atualizar apelido: ' + e.message);
      showToast('Erro: ' + e.message);
    } finally {
      setAdminActionLoading(false);
    }
  };

'''
s = replace_once(s, "  const handleAssignSelectedNode = async () => {", nickname_handler + "  const handleAssignSelectedNode = async () => {", path, 'nickname handler')

s = replace_once(s,
"  const orphanUsers = allUsers.filter(u => u.role !== 'admin' && !positionedUserIds.has(u.id));\n  const allLinks: ReferralLink[] = systemState?.referral_links || [];",
"  const orphanUsers = allUsers.filter(u => u.role !== 'admin' && !positionedUserIds.has(u.id));\n  const registeredMembers = allUsers.filter(u => u.role !== 'admin' && positionedUserIds.has(u.id));\n  const totalAdminMemberPages = Math.max(1, Math.ceil(registeredMembers.length / adminMembersPageSize));\n  const safeAdminMembersPage = Math.min(adminMembersPage, totalAdminMemberPages);\n  const paginatedRegisteredMembers = registeredMembers.slice((safeAdminMembersPage - 1) * adminMembersPageSize, safeAdminMembersPage * adminMembersPageSize);\n  const allLinks: ReferralLink[] = systemState?.referral_links || [];",
path, 'member pagination collections')
s = replace_once(s,
"  const adminTree = allTrees.find(t => t.id === selectedAdminTreeId) || allTrees[0];\n  const adminTreePositions = allPositions.filter(p => p.tree_id === selectedAdminTreeId);",
"  const adminTree = allTrees.find(t => t.id === selectedAdminTreeId) || allTrees[0];\n  const adminTreePositions = allPositions.filter(p => p.tree_id === selectedAdminTreeId);\n  const treeDisplayName = (tree?: Tree | null) => tree?.nickname?.trim() || tree?.display_name || tree?.category_name || (tree?.token_requirement ? `${tree.token_requirement} sementes` : 'Árvore');",
path, 'tree display helper')

# Public registration text
s = replace_all(s, "Você receberá <strong>25 sementes gratuitas</strong> no cadastro para fortalecer o tronco e garantir sua posição na ramificação.",
                "Você receberá <strong>1 pacote com 25 sementes</strong> para reservar sua vaga e mais <strong>25 sementes</strong> disponíveis para envio posterior ao tronco.")

# Member overview label
s = replace_all(s, "{memberTree?.category_name} · Ciclo #{memberTree?.cycle_number}", "{treeDisplayName(memberTree)} · Ciclo #{memberTree?.cycle_number}")

old_card = r'''                  {currentUser.role !== 'admin' && !isUserPositioned && currentUser.balance >= 25 && (
                    <div className="bg-gradient-to-br from-amber-950/70 via-slate-900 to-emerald-950/60 border-2 border-amber-400 rounded-2xl p-4 space-y-3 shadow-2xl relative overflow-hidden animate-in fade-in">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <Zap className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                        <span className="uppercase tracking-wider">Aguardando Sua Ativação na Árvore</span>
                      </div>

                      <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed space-y-2">
                        <p className="text-balance">
                          <strong>Atenção:</strong> Você possui <strong>25 sementes</strong> concedidas no cadastro, mas <strong>ainda não está posicionado na ramificação</strong>.
                        </p>
                        <p className="text-emerald-300 font-medium text-balance">
                          ⚡ Você só entra e aparece na árvore no momento em que clicar no botão abaixo. Se outra pessoa estiver fazendo o mesmo procedimento e clicar antes de você, <strong>ela garantirá uma posição muito melhor na árvore</strong>!
                        </p>
                      </div>

                      {/* THE EXACT BUTTON REQUESTED */}
                      <button
                        onClick={() => handleStrengthenTronco(currentUser.id, memberTree.id)}
                        disabled={activatingTronco}
                        className="w-full bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-xl text-balance"
                      >
                        {activatingTronco ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        ) : (
                          <Sprout className="w-4 h-4 text-slate-950" />
                        )}
                        <span>Transferir 25 Sementes para fortalecer o tronco</span>
                      </button>

                      <div className="text-[10px] text-center text-slate-400">
                        Destinatário do tronco atual: <strong>{memberTree?.tronco_full_name} (@{memberTree?.tronco_username})</strong>
                      </div>
                    </div>
                  )}'''
new_card = r'''                  {currentUser.role !== 'admin' && !isUserPositioned && currentUser.balance >= 25 && (
                    <div className="bg-gradient-to-br from-amber-950/70 via-slate-900 to-rose-950/60 border-2 border-amber-400 rounded-2xl p-4 space-y-3 shadow-2xl relative overflow-hidden animate-in fade-in">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <Zap className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                        <span className="uppercase tracking-wider">🎁 Parabéns!</span>
                      </div>

                      <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed space-y-2">
                        <p className="text-balance">Você está participando do <strong>EcoTerra Arboris</strong>.</p>
                        <p className="text-balance">
                          Você recebeu gratuitamente <strong>25 sementes</strong>, que serão convertidas em sementes reais de árvores que serão plantadas por voluntários.
                        </p>
                        <p className="text-amber-300 font-medium text-balance">
                          Ao clicar em OK, 25 sementes serão consumidas para reservar sua vaga na árvore. Elas não serão enviadas ao tronco.
                        </p>
                      </div>

                      <button
                        onClick={() => handleReserveTreeEntry(memberTree.id)}
                        disabled={activatingTronco}
                        className="w-full bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-xl text-balance"
                      >
                        {activatingTronco ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        ) : (
                          <Sprout className="w-4 h-4 text-slate-950" />
                        )}
                        <span>OK</span>
                      </button>
                    </div>
                  )}'''
s = replace_once(s, old_card, new_card, path, 'gift reserve card')

# Positioned card red/reserved and send-tronco button
s = replace_all(s, "p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl", "p-3 bg-rose-950/40 border border-rose-500/40 rounded-2xl")
s = replace_all(s, "text-emerald-300">Posição Ativa na Árvore:", "text-rose-300">Vaga reservada na árvore:")
s = replace_all(s, "text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800", "text-rose-300 bg-rose-950 px-2 py-0.5 rounded border border-rose-800")
s = replace_all(s, "CONFIRMADO", "RESERVADA")
s = replace_once(s,
"                      {/* Contextual Progression Card */}",
"                      <div className=\"p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs\">\n                        <div className=\"font-bold text-rose-300\">− 25 Sementes</div>\n                        <div className=\"text-slate-300\">Sua vaga na árvore está reservada.</div>\n                        <div className=\"text-[11px] text-slate-400\">Saldo disponível: <strong>{currentUser.balance}</strong> sementes.</div>\n                        {currentUser.balance >= 25 && (\n                          <button\n                            onClick={() => handleStrengthenTronco(currentUser.id, memberTree.id)}\n                            disabled={activatingTronco}\n                            className=\"w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2\"\n                          >\n                            {activatingTronco ? <RefreshCw className=\"w-3.5 h-3.5 animate-spin\" /> : <Sprout className=\"w-3.5 h-3.5\" />}\n                            <span>Enviar 25 sementes ao tronco</span>\n                          </button>\n                        )}\n                      </div>\n\n                      {/* Contextual Progression Card */}",
path, 'reserved message and later transfer button')

# Tree nicknames in admin list and actions
s = replace_all(s, "{tree.category_name}", "{treeDisplayName(tree)}")
s = replace_all(s, "Explorador da Árvore: <span className=\"text-amber-400 font-mono\">{adminTree.tree_code}</span>", "Explorador da Árvore: <span className=\"text-amber-400 font-mono\">{adminTree.tree_code}</span> · <span className=\"text-slate-300\">{treeDisplayName(adminTree)}</span>")
s = replace_once(s,
"                          <button\n                            type=\"button\"\n                            disabled={adminActionLoading || adminTree.status !== 'active'}\n                            onClick={handleArchiveSelectedTree}",
"                          <button\n                            type=\"button\"\n                            disabled={adminActionLoading}\n                            onClick={handleUpdateTreeNickname}\n                            className=\"w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold flex items-center justify-center gap-2 transition\"\n                          >\n                            <Palette className=\"w-3.5 h-3.5\" />\n                            <span>Apelidar árvore</span>\n                          </button>\n                          <button\n                            type=\"button\"\n                            disabled={adminActionLoading || adminTree.status !== 'active'}\n                            onClick={handleArchiveSelectedTree}",
path, 'nickname button')

# Admin create member button/hide form and pagination
s = replace_once(s,
"                  <form onSubmit={handleAdminCreateUser} className=\"p-3.5 bg-slate-900 border border-amber-800/60 rounded-2xl space-y-3\">",
"                  <button\n                    type=\"button\"\n                    onClick={() => setShowAdminCreateMemberForm(value => !value)}\n                    className=\"w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2\"\n                  >\n                    <PlusCircle className=\"w-3.5 h-3.5\" />\n                    <span>Criar membro</span>\n                  </button>\n\n                  {showAdminCreateMemberForm && (\n                  <form onSubmit={handleAdminCreateUser} className=\"p-3.5 bg-slate-900 border border-amber-800/60 rounded-2xl space-y-3\">",
path, 'hide create member form start')
s = replace_once(s, "                  </form>\n\n                  {adminCreateUserError", "                  </form>\n                  )}\n\n                  {adminCreateUserError", path, 'hide create member form end')
s = replace_all(s, "<span>Criar usuário</span>", "<span>Criar membro</span>")
s = replace_once(s,
"                    <div className=\"text-xs font-bold text-slate-200\">\n                      Membros Cadastrados ({allUsers.filter(u => u.role !== 'admin').length})\n                    </div>",
"                    <div className=\"flex items-center justify-between gap-2 text-xs\">\n                      <div className=\"font-bold text-slate-200\">\n                        Membros Cadastrados ({registeredMembers.length})\n                      </div>\n                      <select\n                        value={adminMembersPageSize}\n                        onChange={(e) => { setAdminMembersPageSize(parseInt(e.target.value)); setAdminMembersPage(1); }}\n                        className=\"bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-[11px]\"\n                      >\n                        {[5, 10, 25, 100].map(size => <option key={size} value={size}>{size}</option>)}\n                      </select>\n                    </div>",
path, 'members count and page size')
s = replace_all(s, "{allUsers.filter(user => user.role !== 'admin').map(user => (", "{paginatedRegisteredMembers.map(user => (")
s = replace_once(s,
"                    </div>\n                  </div>\n                </div>\n              )}\n\n              {/* SUB-TAB: ÓRFÃOS */}",
"                    </div>\n\n                    <div className=\"flex items-center justify-between text-[11px] text-slate-400\">\n                      <button\n                        type=\"button\"\n                        disabled={safeAdminMembersPage <= 1}\n                        onClick={() => setAdminMembersPage(page => Math.max(1, page - 1))}\n                        className=\"px-2 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40\"\n                      >\n                        Anterior\n                      </button>\n                      <span>Página {safeAdminMembersPage} de {totalAdminMemberPages}</span>\n                      <button\n                        type=\"button\"\n                        disabled={safeAdminMembersPage >= totalAdminMemberPages}\n                        onClick={() => setAdminMembersPage(page => Math.min(totalAdminMemberPages, page + 1))}\n                        className=\"px-2 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40\"\n                      >\n                        Próxima\n                      </button>\n                    </div>\n                  </div>\n                </div>\n              )}\n\n              {/* SUB-TAB: ÓRFÃOS */}",
path, 'pagination footer')

# Footer label
s = replace_all(s, "<span className=\"text-[10px]\">Regras</span>", "<span className=\"text-[10px]\">Manual</span>")

# Highlight current user reservation in tree nodes (best effort across models)
s = replace_all(s, "bg-emerald-950 border-2 border-emerald-400 text-white ring-2 ring-emerald-500/50", "bg-rose-950 border-2 border-rose-400 text-white ring-2 ring-rose-500/50")
s = replace_all(s, "bg-emerald-400 text-slate-950", "bg-rose-400 text-slate-950")
write(path, s)

print('Manual/members/nickname/reservation patch applied')
