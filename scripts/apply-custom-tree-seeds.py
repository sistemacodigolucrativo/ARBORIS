from pathlib import Path

ROOT = Path('.')


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label}: expected block not found')
    return text.replace(old, new, 1)

# 1) Types: each tree may define its own seed/token requirement.
path = 'src/types/game.ts'
text = read(path)
if 'tokenRequirement?: number | null;' not in text:
    text = replace_once(
        text,
        '  nickname?: string | null;\n  troncoUserId: number;',
        '  nickname?: string | null;\n  tokenRequirement?: number | null;\n  troncoUserId: number;',
        'types tree tokenRequirement'
    )
write(path, text)

# 2) DB: persist tree-specific tokenRequirement.
path = 'server/db.ts'
text = read(path)
text = text.replace(
    "['trees','trees','id','id categoryId treeCode nickname troncoUserId status cycleNumber parentTreeId createdAt completedAt']",
    "['trees','trees','id','id categoryId treeCode nickname tokenRequirement troncoUserId status cycleNumber parentTreeId createdAt completedAt']"
)
write(path, text)

# 3) Migration 005: additive only.
path = 'server/migrations/005_tree_token_requirement.sql'
if not (ROOT / path).exists():
    write(path, 'ALTER TABLE trees ADD COLUMN IF NOT EXISTS tokenRequirement INT NULL AFTER nickname;\n')

# 4) Game engine: resolve seed amount from tree first, category second.
path = 'src/services/gameEngine.ts'
text = read(path)
if 'export function resolveTreeTokenRequirement' not in text:
    text = replace_once(
        text,
        "function nowIso(): string {\n  return new Date().toISOString();\n}\n",
        "function nowIso(): string {\n  return new Date().toISOString();\n}\n\nexport function resolveTreeTokenRequirement(state: GameDatabaseState, tree: Tree): number | null {\n  const direct = typeof tree.tokenRequirement === 'number' ? tree.tokenRequirement : null;\n  if (direct && direct > 0) return direct;\n  const category = state.config.categories.find(c => c.id === tree.categoryId);\n  if (category?.tokenRequirement && category.tokenRequirement > 0) return category.tokenRequirement;\n  const fallback = state.config.transferAmount || state.config.initialSeedsGrant || 25;\n  return fallback > 0 ? fallback : null;\n}\n",
        'gameEngine helper insert'
    )
text = replace_once(
    text,
    "  const targetTree = refCheck.tree;\n  const category = state.config.categories.find(c => c.id === targetTree.categoryId);\n  const reservationAmount = category?.tokenRequirement || state.config.initialSeedsGrant || 25;\n  const initialGrant = reservationAmount * 2;",
    "  const targetTree = refCheck.tree;\n  const reservationAmount = resolveTreeTokenRequirement(state, targetTree);\n  if (!reservationAmount) {\n    return { success: false, state: originalState, error: 'Quantidade de sementes da árvore inválida ou não configurada.' };\n  }\n  const initialGrant = reservationAmount * 2;",
    'gameEngine createParticipant requirement'
)
text = replace_once(
    text,
    "  const category = state.config.categories.find(c => c.id === tree.categoryId);\n  if (!category || !category.tokenRequirement || category.tokenRequirement <= 0) {\n    return { success: false, state: originalState, error: 'Configuração da categoria inválida ou corrompida.' };\n  }\n  const requiredAmount = category.tokenRequirement;",
    "  const requiredAmount = resolveTreeTokenRequirement(state, tree);\n  if (!requiredAmount) {\n    return { success: false, state: originalState, error: 'Quantidade de sementes da árvore inválida ou corrompida.' };\n  }",
    'gameEngine reserve requirement'
)
text = replace_once(
    text,
    "  // Strict backend amount resolution from category (CRÍTICO 1)\n  const category = state.config.categories.find(c => c.id === tree.categoryId);\n  if (!category || !category.tokenRequirement || category.tokenRequirement <= 0) {\n    return { success: false, state: originalState, error: 'Configuração da categoria inválida ou corrompida. Operação abortada.' };\n  }\n  const requiredAmount = category.tokenRequirement;",
    "  // Strict backend amount resolution from tree first, category fallback second.\n  const requiredAmount = resolveTreeTokenRequirement(state, tree);\n  if (!requiredAmount) {\n    return { success: false, state: originalState, error: 'Quantidade de sementes da árvore inválida ou corrompida. Operação abortada.' };\n  }",
    'gameEngine strengthen requirement'
)
if 'const childTokenRequirement = mother.tokenRequirement ?? resolveTreeTokenRequirement(state, mother) ?? null;' not in text:
    text = replace_once(
        text,
        '  const leftTroncoUid = leftPositions[0].userId!;\n  const rightTroncoUid = rightPositions[0].userId!;\n',
        '  const leftTroncoUid = leftPositions[0].userId!;\n  const rightTroncoUid = rightPositions[0].userId!;\n  const childTokenRequirement = mother.tokenRequirement ?? resolveTreeTokenRequirement(state, mother) ?? null;\n',
        'gameEngine child requirement const'
    )
    text = replace_once(
        text,
        '    treeCode: `${mother.treeCode}-L`,\n    troncoUserId: leftTroncoUid,',
        '    treeCode: `${mother.treeCode}-L`,\n    tokenRequirement: childTokenRequirement,\n    troncoUserId: leftTroncoUid,',
        'gameEngine left child token'
    )
    text = replace_once(
        text,
        '    treeCode: `${mother.treeCode}-R`,\n    troncoUserId: rightTroncoUid,',
        '    treeCode: `${mother.treeCode}-R`,\n    tokenRequirement: childTokenRequirement,\n    troncoUserId: rightTroncoUid,',
        'gameEngine right child token'
    )
write(path, text)

# 5) Admin game engine: create trees with custom seed amount.
path = 'src/services/adminGameEngine.ts'
text = read(path)
text = replace_once(
    text,
    "  params: {\n    categoryId: number;\n    troncoUserId: number;",
    "  params: {\n    categoryId: number;\n    tokenRequirement?: number;\n    troncoUserId: number;",
    'adminGameEngine create params'
)
text = replace_once(
    text,
    "  const nextTreeId = nextId(state.trees);\n  const nextCycle = Math.max(0, ...state.trees.map(tree => tree.cycleNumber || 0)) + 1;\n  const treeCode = `ARB-TREE-${String(category.tokenRequirement).padStart(2, '0')}-${String(nextTreeId).padStart(3, '0')}`;",
    "  const requestedRequirement = params.tokenRequirement ?? category.tokenRequirement;\n  const tokenRequirement = Number.isInteger(requestedRequirement) && requestedRequirement > 0 ? requestedRequirement : category.tokenRequirement;\n  if (!tokenRequirement || tokenRequirement <= 0) {\n    return { success: false, state: originalState, error: 'Quantidade de sementes inválida para a árvore.' };\n  }\n\n  const nextTreeId = nextId(state.trees);\n  const nextCycle = Math.max(0, ...state.trees.map(tree => tree.cycleNumber || 0)) + 1;\n  const treeCode = `ARB-TREE-${String(tokenRequirement).padStart(2, '0')}-${String(nextTreeId).padStart(3, '0')}`;",
    'adminGameEngine treeCode requirement'
)
if 'tokenRequirement,' not in text.split('const tree: Tree = {', 1)[1].split('};', 1)[0]:
    text = replace_once(
        text,
        '    treeCode,\n    nickname: null,\n    troncoUserId: tronco.id,',
        '    treeCode,\n    nickname: null,\n    tokenRequirement,\n    troncoUserId: tronco.id,',
        'adminGameEngine tree field'
    )
text = replace_once(
    text,
    "    treeCode: tree.treeCode,\n    githubActor: params.actor.githubActor || null",
    "    treeCode: tree.treeCode,\n    tokenRequirement,\n    initialGrant: tokenRequirement * 2,\n    githubActor: params.actor.githubActor || null",
    'adminGameEngine audit token'
)
write(path, text)

# 6) Server actions: accept tokenRequirement and activation amount from tree.
path = 'server/actions.ts'
text = read(path)
text = text.replace(
    "import { ActionResult, createParticipant, reserveTreeEntry, strengthenTronco, transferSeeds, validateReferral, splitTreeIfComplete } from '../src/services/gameEngine';",
    "import { ActionResult, createParticipant, reserveTreeEntry, strengthenTronco, transferSeeds, validateReferral, splitTreeIfComplete, resolveTreeTokenRequirement } from '../src/services/gameEngine';"
)
text = replace_once(
    text,
    "  z.object({ action: z.literal('create_tree'), params: z.object({ categoryId: id, troncoUserId: id }).strict() }),",
    "  z.object({ action: z.literal('create_tree'), params: z.object({ categoryId: id, tokenRequirement: z.number().int().positive().max(1000000).optional(), troncoUserId: id }).strict() }),",
    'actions create_tree schema'
)
text = replace_once(
    text,
    "      const category = next.config.categories.find(c => c.id === tree.categoryId);\n      const amount = category?.tokenRequirement || next.config.transferAmount || 25;",
    "      const amount = resolveTreeTokenRequirement(next, tree);\n      if (!amount) return { success: false, state, error: 'Quantidade de sementes da árvore inválida.' };",
    'actions request_activation amount'
)
write(path, text)

# 7) Referral validation must expose tree requirement, not fixed category only.
path = 'server/app.ts'
text = read(path)
text = text.replace(
    "import { validateReferral } from '../src/services/gameEngine';",
    "import { validateReferral, resolveTreeTokenRequirement } from '../src/services/gameEngine';"
)
text = replace_once(
    text,
    "      const cat = state.config.categories.find(c => c.id === ref.tree!.categoryId);\n      const tronco = state.users.find(u => u.id === ref.tree!.troncoUserId);\n      return { username: ref.referrer.username, full_name: ref.referrer.name, tree_id: ref.tree.id, tree_code: ref.tree.treeCode,\n        category_name: cat?.name, token_requirement: cat?.tokenRequirement, tronco_full_name: tronco?.name, tronco_username: tronco?.username };",
    "      const cat = state.config.categories.find(c => c.id === ref.tree!.categoryId);\n      const tokenRequirement = resolveTreeTokenRequirement(state, ref.tree!);\n      const tronco = state.users.find(u => u.id === ref.tree!.troncoUserId);\n      return { username: ref.referrer.username, full_name: ref.referrer.name, tree_id: ref.tree.id, tree_code: ref.tree.treeCode,\n        category_name: cat?.name, token_requirement: tokenRequirement, initial_grant: tokenRequirement ? tokenRequirement * 2 : null, tronco_full_name: tronco?.name, tronco_username: tronco?.username };",
    'app referral response token requirement'
)
write(path, text)

# 8) DataStore: expose tree requirement and display custom amount.
path = 'src/services/dataStore.ts'
text = read(path)
text = replace_once(
    text,
    "      const cat = this.state!.config.categories.find(c => c.id === t.categoryId);\n      const occupied = t.positions.filter(p => p.status === 'occupied').length;\n      return {",
    "      const cat = this.state!.config.categories.find(c => c.id === t.categoryId);\n      const tokenRequirement = t.tokenRequirement ?? cat?.tokenRequirement ?? 0;\n      const occupied = t.positions.filter(p => p.status === 'occupied').length;\n      return {",
    'dataStore tree requirement const'
)
text = replace_once(
    text,
    "        display_name: t.nickname || cat?.name,",
    "        display_name: t.nickname || (tokenRequirement ? `${tokenRequirement} sementes` : cat?.name),",
    'dataStore display name'
)
text = replace_once(
    text,
    "        category_name: cat?.name,\n        token_requirement: cat?.tokenRequirement,",
    "        category_name: tokenRequirement ? `${tokenRequirement} sementes` : cat?.name,\n        token_requirement: tokenRequirement,",
    'dataStore token requirement field'
)
write(path, text)

# 9) Direct admin actions: send tokenRequirement to backend.
path = 'src/services/directAdminActions.ts'
text = read(path)
text = replace_once(
    text,
    "export function createTreeDirect({ categoryId, troncoUserId }: { categoryId: number; troncoUserId: number } & ActorParams) {\n  return apiMutation('/actions', { action: 'create_tree', params: { categoryId, troncoUserId } });\n}",
    "export function createTreeDirect({ categoryId, tokenRequirement, troncoUserId }: { categoryId: number; tokenRequirement?: number; troncoUserId: number } & ActorParams) {\n  return apiMutation('/actions', { action: 'create_tree', params: { categoryId, tokenRequirement, troncoUserId } });\n}",
    'directAdminActions createTreeDirect'
)
write(path, text)

# 10) UI: custom amount field, dynamic labels.
path = 'src/App.tsx'
text = read(path)
if 'const [newTreeSeeds, setNewTreeSeeds]' not in text:
    text = replace_once(
        text,
        "  const [newTreeCatId, setNewTreeCatId] = useState<number>(1);\n  const [newTreeTroncoId, setNewTreeTroncoId] = useState<number>(2);",
        "  const [newTreeCatId, setNewTreeCatId] = useState<number>(1);\n  const [newTreeSeeds, setNewTreeSeeds] = useState<number>(25);\n  const [newTreeTroncoId, setNewTreeTroncoId] = useState<number>(2);",
        'App newTreeSeeds state'
    )
text = replace_once(
    text,
    "        showToast('− 25 Sementes. Sua vaga na árvore está reservada.');",
    "        showToast(`− ${res.result.amountConsumed} Sementes. Sua vaga na árvore está reservada.`);",
    'App reserve dynamic toast'
)
text = replace_once(
    text,
    '                <div className="text-lg font-black text-emerald-300">Ative suas 25 sementes</div>',
    '                <div className="text-lg font-black text-emerald-300">Ative suas {activationModalData.amount} sementes</div>',
    'App activation modal title'
)
text = replace_once(
    text,
    "  setAdminActionLoading(true);\n  setAdminActionMessage(null);\n  try {\n    const res = await createTreeDirect({\n      categoryId: newTreeCatId,\n      troncoUserId: newTreeTroncoId,",
    "  const treeSeeds = Number(newTreeSeeds);\n  if (!Number.isInteger(treeSeeds) || treeSeeds <= 0 || treeSeeds > 1000000) {\n    showToast('Informe uma quantidade de sementes válida para a árvore.');\n    return;\n  }\n\n  const categories = systemState?.categories || [];\n  const matchedCategory = categories.find((cat: any) => Number(cat.token_requirement) === treeSeeds);\n  const categoryId = matchedCategory?.id || categories[0]?.id || newTreeCatId;\n\n  setAdminActionLoading(true);\n  setAdminActionMessage(null);\n  try {\n    const res = await createTreeDirect({\n      categoryId,\n      tokenRequirement: treeSeeds,\n      troncoUserId: newTreeTroncoId,",
    'App handleCreateTree custom seeds'
)
text = replace_once(
    text,
    "      setShowCreateTreeModal(false);\n      setAdminActionMessage('Árvore criada e salva no banco de dados.');\n      showToast('Árvore criada e salva no banco de dados.');",
    "      setShowCreateTreeModal(false);\n      setAdminActionMessage(`Árvore de ${treeSeeds} sementes criada e salva no banco de dados.`);\n      showToast(`Árvore de ${treeSeeds} sementes criada e salva no banco de dados.`);",
    'App create tree toast'
)
text = replace_once(
    text,
    "              <div>\n                <label className=\"block text-slate-300 mb-1 font-medium\">Categoria da Árvore</label>\n                <select\n                  value={newTreeCatId}\n                  onChange={e => setNewTreeCatId(parseInt(e.target.value))}\n                  className=\"w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none\"\n                >\n                  {(systemState?.categories || []).map((cat: any) => (\n                    <option key={cat.id} value={cat.id}>\n                      {cat.token_requirement} sementes\n                    </option>\n                  ))}\n                </select>\n              </div>",
    "              <div>\n                <label className=\"block text-slate-300 mb-1 font-medium\">Quantidade de sementes da árvore</label>\n                <input\n                  type=\"number\"\n                  min={1}\n                  max={1000000}\n                  step={1}\n                  value={newTreeSeeds}\n                  onChange={e => setNewTreeSeeds(parseInt(e.target.value) || 1)}\n                  className=\"w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none\"\n                  placeholder=\"Ex: 2, 25, 50, 100\"\n                />\n                <p className=\"text-[10px] text-slate-500 mt-1 leading-relaxed\">\n                  O novo participante receberá automaticamente o dobro: metade para reserva e metade para ativação Pix do tronco.\n                </p>\n              </div>",
    'App create tree modal seed input'
)
write(path, text)

print('custom tree seeds patch applied')
