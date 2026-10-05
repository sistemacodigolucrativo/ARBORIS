from pathlib import Path

ROOT = Path('.')

def read(path: str) -> str:
    return (ROOT / path).read_text()

def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content)

def replace_once(content: str, old: str, new: str, path: str, label: str) -> str:
    if old not in content:
        raise SystemExit(f'{path}: missing expected block for {label}')
    return content.replace(old, new, 1)

# -----------------------------------------------------------------------------
# Restore immutable 001 migration and add incremental 003 Pix migration.
# -----------------------------------------------------------------------------
original_001 = """CREATE TABLE IF NOT EXISTS game_lock (id INT PRIMARY KEY) ENGINE=InnoDB;
INSERT IGNORE INTO game_lock (id) VALUES (1);
CREATE TABLE IF NOT EXISTS game_config (id INT PRIMARY KEY, config JSON NOT NULL) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS users (
 id INT PRIMARY KEY, username VARCHAR(100) NOT NULL UNIQUE, name VARCHAR(200) NOT NULL,
 githubActor VARCHAR(100) NULL, role ENUM('participant','admin') NOT NULL,
 status ENUM('active','blocked') NOT NULL, createdAt VARCHAR(30) NOT NULL, updatedAt VARCHAR(30) NOT NULL,
 currentTreeId INT NULL, currentPositionIndex INT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS wallets (
 userId INT PRIMARY KEY, balance INT NOT NULL CHECK (balance >= 0), updatedAt VARCHAR(30) NOT NULL,
 FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS trees (
 id INT PRIMARY KEY, categoryId INT NOT NULL, treeCode VARCHAR(100) NOT NULL UNIQUE,
 troncoUserId INT NOT NULL, status ENUM('active','completed','archived') NOT NULL,
 cycleNumber INT NOT NULL, parentTreeId INT NULL, createdAt VARCHAR(30) NOT NULL, completedAt VARCHAR(30) NULL,
 FOREIGN KEY (troncoUserId) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS tree_positions (
 treeId INT NOT NULL, `index` INT NOT NULL CHECK (`index` BETWEEN 0 AND 14), level INT NOT NULL,
 side ENUM('root','left','right') NOT NULL, userId INT NULL, status ENUM('vacant','occupied') NOT NULL,
 occupiedAt VARCHAR(30) NULL, username VARCHAR(100) NULL, name VARCHAR(200) NULL,
 PRIMARY KEY (treeId, `index`), UNIQUE KEY position_user (treeId, userId),
 FOREIGN KEY (treeId) REFERENCES trees(id), FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS referrals (
 id INT PRIMARY KEY, referrerUserId INT NOT NULL, referredUserId INT NULL, treeId INT NOT NULL,
 token VARCHAR(200) NOT NULL UNIQUE, clicks INT NOT NULL, registrationsCount INT NOT NULL,
 isActive BOOLEAN NOT NULL, createdAt VARCHAR(30) NOT NULL,
 FOREIGN KEY (referrerUserId) REFERENCES users(id), FOREIGN KEY (referredUserId) REFERENCES users(id),
 FOREIGN KEY (treeId) REFERENCES trees(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS ledger (
 id INT PRIMARY KEY, type VARCHAR(60) NOT NULL, fromUserId INT NULL, toUserId INT NOT NULL, treeId INT NULL,
 amount INT NOT NULL CHECK (amount >= 0), reason TEXT NOT NULL, idempotencyKey VARCHAR(200) NOT NULL UNIQUE,
 createdAt VARCHAR(30) NOT NULL, fromUsername VARCHAR(100) NULL, toUsername VARCHAR(100) NULL,
 FOREIGN KEY (fromUserId) REFERENCES users(id), FOREIGN KEY (toUserId) REFERENCES users(id),
 FOREIGN KEY (treeId) REFERENCES trees(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS audit_log (
 id INT PRIMARY KEY, actorUserId INT NOT NULL, action VARCHAR(100) NOT NULL,
 entity VARCHAR(100) NOT NULL, entityId JSON NOT NULL, metadata JSON NOT NULL,
 createdAt VARCHAR(30) NOT NULL, actorUsername VARCHAR(100) NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS credentials (
 userId INT PRIMARY KEY, passwordHash VARCHAR(250) NOT NULL, FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS sessions (
 tokenHash CHAR(64) PRIMARY KEY, userId INT NOT NULL, expiresAt DATETIME NOT NULL,
 INDEX (expiresAt), FOREIGN KEY (userId) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS action_requests (
 requestKey VARCHAR(128) PRIMARY KEY, actorId INT NOT NULL, requestHash CHAR(64) NOT NULL,
 result JSON NOT NULL, createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;"""
write('server/migrations/001_initial.sql', original_001)
(ROOT / 'server/migrations/003_user_pix.sql').write_text(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS pixHolderName VARCHAR(200) NULL AFTER currentPositionIndex;\n"
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS pixKeyType ENUM('random','email','phone') NULL AFTER pixHolderName;\n"
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS pixKey VARCHAR(200) NULL AFTER pixKeyType;\n"
)

# -----------------------------------------------------------------------------
# Types
# -----------------------------------------------------------------------------
path = 'src/types/game.ts'
s = read(path)
s = replace_once(s,
"  currentTreeId?: number | null;\n  currentPositionIndex?: number | null;\n}",
"  currentTreeId?: number | null;\n  currentPositionIndex?: number | null;\n  pixHolderName?: string | null;\n  pixKeyType?: 'random' | 'email' | 'phone' | null;\n  pixKey?: string | null;\n}",
path, 'User pix fields')
write(path, s)

# -----------------------------------------------------------------------------
# DB mapping
# -----------------------------------------------------------------------------
path = 'server/db.ts'
s = read(path)
s = replace_once(s,
"  ['users','users','id','id username name githubActor role status createdAt updatedAt currentTreeId currentPositionIndex'],",
"  ['users','users','id','id username name githubActor role status createdAt updatedAt currentTreeId currentPositionIndex pixHolderName pixKeyType pixKey'],",
path, 'users descriptor pix fields')
write(path, s)

# -----------------------------------------------------------------------------
# Server action schema + reducer
# -----------------------------------------------------------------------------
path = 'server/actions.ts'
s = read(path)
s = replace_once(s,
"const text = z.string().trim().min(1).max(80);\nexport const passwordSchema",
"const text = z.string().trim().min(1).max(80);\nconst pixKeyTypeSchema = z.enum(['random', 'email', 'phone']);\nconst pixHolderSchema = z.string().trim().min(1).max(120);\nconst pixKeySchema = z.string().trim().min(1).max(200);\nexport const passwordSchema",
path, 'pix schemas')
s = replace_once(s,
"  z.object({ action: z.literal('reserve_tree_entry'), params: z.object({ treeId: id }).strict() }),\n  z.object({ action: z.literal('assign_tree_position'), params: z.object({ treeId: id, positionIndex: z.number().int().min(1).max(14), userId: id }).strict() }),",
"  z.object({ action: z.literal('reserve_tree_entry'), params: z.object({ treeId: id }).strict() }),\n  z.object({ action: z.literal('update_pix'), params: z.object({ holderName: pixHolderSchema, keyType: pixKeyTypeSchema, key: pixKeySchema }).strict() }),\n  z.object({ action: z.literal('clear_pix'), params: z.object({}).strict() }),\n  z.object({ action: z.literal('assign_tree_position'), params: z.object({ treeId: id, positionIndex: z.number().int().min(1).max(14), userId: id }).strict() }),",
path, 'action schema pix actions')
s = replace_once(s,
"  if (!['reserve_tree_entry', 'strengthen_tronco', 'transfer_seeds'].includes(input.action) && user.role !== 'admin') throw new HttpError(403, 'Acesso administrativo obrigatório.');",
"  if (!['reserve_tree_entry', 'strengthen_tronco', 'transfer_seeds', 'update_pix', 'clear_pix'].includes(input.action) && user.role !== 'admin') throw new HttpError(403, 'Acesso administrativo obrigatório.');",
path, 'pix participant permission')
s = replace_once(s,
"    case 'reserve_tree_entry':\n      if (user.role === 'admin') throw new HttpError(403, 'Coordenador não participa deste fluxo.');\n      return reserveTreeEntry(state, { userId: user.id, treeId: input.params.treeId, idempotencyKey: key });\n    case 'assign_tree_position': return assignTreePositionByAdmin(state, { ...input.params, actor, idempotencyKey: key });",
"    case 'reserve_tree_entry':\n      if (user.role === 'admin') throw new HttpError(403, 'Coordenador não participa deste fluxo.');\n      return reserveTreeEntry(state, { userId: user.id, treeId: input.params.treeId, idempotencyKey: key });\n    case 'update_pix': {\n      const next = structuredClone(state);\n      const target = next.users.find(u => u.id === user.id);\n      if (!target || target.status !== 'active') throw new HttpError(400, 'Participante inativo ou inexistente.');\n      target.pixHolderName = input.params.holderName;\n      target.pixKeyType = input.params.keyType;\n      target.pixKey = input.params.key;\n      target.updatedAt = new Date().toISOString();\n      next.auditLog.push({\n        id: Math.max(0, ...next.auditLog.map(a => a.id)) + 1,\n        actorUserId: user.id,\n        actorUsername: user.username,\n        action: 'USER_PIX_UPDATED',\n        entity: 'user',\n        entityId: user.id,\n        metadata: { idempotencyKey: key, keyType: input.params.keyType },\n        createdAt: target.updatedAt\n      });\n      return { success: true, state: next, result: { pixHolderName: target.pixHolderName, pixKeyType: target.pixKeyType, pixKey: target.pixKey } };\n    }\n    case 'clear_pix': {\n      const next = structuredClone(state);\n      const target = next.users.find(u => u.id === user.id);\n      if (!target || target.status !== 'active') throw new HttpError(400, 'Participante inativo ou inexistente.');\n      target.pixHolderName = null;\n      target.pixKeyType = null;\n      target.pixKey = null;\n      target.updatedAt = new Date().toISOString();\n      next.auditLog.push({\n        id: Math.max(0, ...next.auditLog.map(a => a.id)) + 1,\n        actorUserId: user.id,\n        actorUsername: user.username,\n        action: 'USER_PIX_CLEARED',\n        entity: 'user',\n        entityId: user.id,\n        metadata: { idempotencyKey: key },\n        createdAt: target.updatedAt\n      });\n      return { success: true, state: next, result: { pixHolderName: null, pixKeyType: null, pixKey: null } };\n    }\n    case 'assign_tree_position': return assignTreePositionByAdmin(state, { ...input.params, actor, idempotencyKey: key });",
path, 'pix action handlers')
write(path, s)

# -----------------------------------------------------------------------------
# Data store client helpers and visible user fields
# -----------------------------------------------------------------------------
path = 'src/services/dataStore.ts'
s = read(path)
s = replace_once(s,
"  async strengthenTroncoAction(_userId: number, treeId: number) {\n    return apiMutation('/actions', { action: 'strengthen_tronco', params: { treeId } });\n  }",
"  async strengthenTroncoAction(_userId: number, treeId: number) {\n    return apiMutation('/actions', { action: 'strengthen_tronco', params: { treeId } });\n  }\n  async updatePixAction(params: { holderName: string; keyType: 'random' | 'email' | 'phone'; key: string }) {\n    return apiMutation('/actions', { action: 'update_pix', params });\n  }\n  async clearPixAction() {\n    return apiMutation('/actions', { action: 'clear_pix', params: {} });\n  }",
path, 'pix client methods')
s = replace_once(s,
"        full_name: u.name,\n        balance: wallet ? wallet.balance : 0",
"        full_name: u.name,\n        balance: wallet ? wallet.balance : 0,\n        pixHolderName: u.pixHolderName || null,\n        pixKeyType: u.pixKeyType || null,\n        pixKey: u.pixKey || null",
path, 'pix user view fields')
s = replace_once(s,
"❌ Sem dinheiro real, sem PIX e sem depósitos.",
"❌ Sem taxas obrigatórias, sem depósitos no sistema e sem promessa financeira.",
path, 'marketing no pix contradiction')
write(path, s)

# -----------------------------------------------------------------------------
# App UI: user type, states, handlers, Pix card, collapsed admin actions below tree.
# -----------------------------------------------------------------------------
path = 'src/App.tsx'
s = read(path)
s = replace_once(s,
"  current_tree_id?: number | null;\n  current_position_index?: number | null;\n}",
"  current_tree_id?: number | null;\n  current_position_index?: number | null;\n  pixHolderName?: string | null;\n  pixKeyType?: 'random' | 'email' | 'phone' | null;\n  pixKey?: string | null;\n}",
path, 'App User pix fields')
s = replace_once(s,
"  const [adminMembersPage, setAdminMembersPage] = useState<number>(1);\n  const [adminMembersPageSize, setAdminMembersPageSize] = useState<number>(10);",
"  const [adminMembersPage, setAdminMembersPage] = useState<number>(1);\n  const [adminMembersPageSize, setAdminMembersPageSize] = useState<number>(10);\n  const [pixHolderName, setPixHolderName] = useState<string>('');\n  const [pixKeyType, setPixKeyType] = useState<'random' | 'email' | 'phone'>('random');\n  const [pixKey, setPixKey] = useState<string>('');\n  const [pixSaving, setPixSaving] = useState<boolean>(false);",
path, 'pix form state')
s = replace_once(s,
"  useEffect(() => {\n    if (currentUser?.role === 'admin' && currentView === 'member') {\n      setCurrentView('admin');\n    }\n  }, [currentUser, currentView]);",
"  useEffect(() => {\n    if (currentUser?.role === 'admin' && currentView === 'member') {\n      setCurrentView('admin');\n    }\n  }, [currentUser, currentView]);\n\n  useEffect(() => {\n    setPixHolderName(currentUser?.pixHolderName || currentUser?.full_name || '');\n    setPixKeyType(currentUser?.pixKeyType || 'random');\n    setPixKey(currentUser?.pixKey || '');\n  }, [currentUser?.id, currentUser?.pixHolderName, currentUser?.pixKeyType, currentUser?.pixKey, currentUser?.full_name]);",
path, 'pix sync effect')
insert_after_delete = """  const handleDeleteUser = async (userId: number, label: string) => {
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
pix_handlers = insert_after_delete + """

  const handleSavePix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixHolderName.trim() || !pixKey.trim()) {
      showToast('Preencha titular e chave Pix.');
      return;
    }
    setPixSaving(true);
    try {
      const res = await dataStore.updatePixAction({
        holderName: pixHolderName.trim(),
        keyType: pixKeyType,
        key: pixKey.trim()
      });
      if (res.success) {
        await fetchState(true);
        showToast('Chave Pix salva.');
      } else {
        showToast('Erro: ' + (res.error || 'Não foi possível salvar Pix.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    } finally {
      setPixSaving(false);
    }
  };

  const handleClearPix = async () => {
    if (!window.confirm('Remover sua chave Pix cadastrada?')) return;
    setPixSaving(true);
    try {
      const res = await dataStore.clearPixAction();
      if (res.success) {
        await fetchState(true);
        showToast('Chave Pix removida.');
      } else {
        showToast('Erro: ' + (res.error || 'Não foi possível remover Pix.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    } finally {
      setPixSaving(false);
    }
  };
"""
s = replace_once(s, insert_after_delete, pix_handlers, path, 'pix handlers')
s = s.replace('Sem dinheiro real, sem PIX e sem depósitos.', 'Sem taxas obrigatórias, sem depósitos no sistema e sem promessa financeira.')
s = s.replace('Não aceita dinheiro, depósitos bancários, PIX ou saques. Todas as sementes são pontos virtuais internos.', 'O sistema não processa pagamentos nem depósitos internos. A chave Pix é apenas uma informação cadastral do participante, e as sementes continuam sendo pontos virtuais internos.')
old_admin_block = """                      <div className=\"p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs\">
                        <div className=\"font-bold text-slate-200 flex items-center gap-1.5\">
                          <Shield className=\"w-3.5 h-3.5 text-amber-400\" />
                          <span>Ações administrativas da árvore</span>
                        </div>
                        <div className=\"grid grid-cols-1 gap-2\">
                          <button
                            type=\"button\"
                            onClick={() => fetchState(true)}
                            className=\"w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-2 transition\"
                          >
                            <RefreshCw className=\"w-3.5 h-3.5\" />
                            <span>Atualizar dados</span>
                          </button>
                          <button
                            type=\"button\"
                            disabled={adminActionLoading}
                            onClick={handleUpdateTreeNickname}
                            className=\"w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold flex items-center justify-center gap-2 transition\"
                          >
                            <Palette className=\"w-3.5 h-3.5\" />
                            <span>Apelidar árvore</span>
                          </button>
                          <button
                            type=\"button\"
                            disabled={adminActionLoading || adminTree.status !== 'active'}
                            onClick={handleArchiveSelectedTree}
                            className=\"w-full py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 disabled:opacity-50 border border-rose-800 text-rose-200 font-bold flex items-center justify-center gap-2 transition\"
                          >
                            <Lock className=\"w-3.5 h-3.5\" />
                            <span>{adminTree.status === 'active' ? 'Arquivar árvore' : `Status: ${adminTree.status}`}</span>
                          </button>
                          <button
                            type=\"button\"
                            disabled={adminActionLoading}
                            onClick={handleDeleteSelectedTree}
                            className=\"w-full py-2 rounded-xl bg-red-950/80 hover:bg-red-900 disabled:opacity-50 border border-red-800 text-red-200 font-bold flex items-center justify-center gap-2 transition\"
                          >
                            <AlertCircle className=\"w-3.5 h-3.5\" />
                            <span>Excluir árvore definitivamente</span>
                          </button>
                        </div>
                        {adminActionMessage && (
                          <div className=\"p-2 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 leading-relaxed\">
                            {adminActionMessage}
                          </div>
                        )}
                      </div>

                      {renderActiveModel(adminTreePositions)}"""
new_admin_block = """                      {renderActiveModel(adminTreePositions)}

                      <details className=\"p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs\">
                        <summary className=\"font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer select-none\">
                          <Shield className=\"w-3.5 h-3.5 text-amber-400\" />
                          <span>Ações administrativas da árvore</span>
                        </summary>
                        <div className=\"grid grid-cols-1 gap-2 pt-2\">
                          <button
                            type=\"button\"
                            onClick={() => fetchState(true)}
                            className=\"w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-2 transition\"
                          >
                            <RefreshCw className=\"w-3.5 h-3.5\" />
                            <span>Atualizar dados</span>
                          </button>
                          <button
                            type=\"button\"
                            disabled={adminActionLoading}
                            onClick={handleUpdateTreeNickname}
                            className=\"w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold flex items-center justify-center gap-2 transition\"
                          >
                            <Palette className=\"w-3.5 h-3.5\" />
                            <span>Apelidar árvore</span>
                          </button>
                          <button
                            type=\"button\"
                            disabled={adminActionLoading || adminTree.status !== 'active'}
                            onClick={handleArchiveSelectedTree}
                            className=\"w-full py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900 disabled:opacity-50 border border-rose-800 text-rose-200 font-bold flex items-center justify-center gap-2 transition\"
                          >
                            <Lock className=\"w-3.5 h-3.5\" />
                            <span>{adminTree.status === 'active' ? 'Arquivar árvore' : `Status: ${adminTree.status}`}</span>
                          </button>
                          <button
                            type=\"button\"
                            disabled={adminActionLoading}
                            onClick={handleDeleteSelectedTree}
                            className=\"w-full py-2 rounded-xl bg-red-950/80 hover:bg-red-900 disabled:opacity-50 border border-red-800 text-red-200 font-bold flex items-center justify-center gap-2 transition\"
                          >
                            <AlertCircle className=\"w-3.5 h-3.5\" />
                            <span>Excluir árvore definitivamente</span>
                          </button>
                        </div>
                        {adminActionMessage && (
                          <div className=\"p-2 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 leading-relaxed mt-2\">
                            {adminActionMessage}
                          </div>
                        )}
                      </details>"""
s = replace_once(s, old_admin_block, new_admin_block, path, 'collapsed admin actions below tree')
old_wallet_marker = """                  <div className=\"bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3\">
                    <div className=\"flex items-center justify-between text-xs\">
                      <span className=\"font-bold text-slate-200\">Extrato Comunitário (Ledger)</span>"""
pix_card = """                  <div className=\"bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3\">
                    <div className=\"flex items-center justify-between text-xs\">
                      <span className=\"font-bold text-slate-200\">Minha chave Pix</span>
                      <span className=\"text-[10px] text-slate-500 font-mono\">Cadastro do participante</span>
                    </div>
                    <form onSubmit={handleSavePix} className=\"space-y-2 text-xs\">
                      <label className=\"block text-slate-300\">Titular
                        <input
                          required
                          value={pixHolderName}
                          onChange={(e) => setPixHolderName(e.target.value)}
                          className=\"w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500\"
                          placeholder=\"Nome do titular\"
                        />
                      </label>
                      <label className=\"block text-slate-300\">Tipo da chave
                        <select
                          value={pixKeyType}
                          onChange={(e) => setPixKeyType(e.target.value as 'random' | 'email' | 'phone')}
                          className=\"w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500\"
                        >
                          <option value=\"random\">Aleatória</option>
                          <option value=\"email\">E-mail</option>
                          <option value=\"phone\">Telefone</option>
                        </select>
                      </label>
                      <label className=\"block text-slate-300\">Chave Pix
                        <input
                          required
                          value={pixKey}
                          onChange={(e) => setPixKey(e.target.value)}
                          className=\"w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500\"
                          placeholder={pixKeyType === 'email' ? 'nome@email.com' : pixKeyType === 'phone' ? '+5531999999999' : 'chave aleatória'}
                        />
                      </label>
                      <div className=\"grid grid-cols-1 gap-2\">
                        <button
                          type=\"submit\"
                          disabled={pixSaving}
                          className=\"w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2\"
                        >
                          {pixSaving ? <RefreshCw className=\"w-3.5 h-3.5 animate-spin\" /> : <Check className=\"w-3.5 h-3.5\" />}
                          <span>Salvar chave Pix</span>
                        </button>
                        {currentUser.pixKey && (
                          <button
                            type=\"button\"
                            disabled={pixSaving}
                            onClick={handleClearPix}
                            className=\"w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold\"
                          >
                            Remover chave Pix
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  <div className=\"bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3\">
                    <div className=\"flex items-center justify-between text-xs\">
                      <span className=\"font-bold text-slate-200\">Extrato Comunitário (Ledger)</span>"""
s = replace_once(s, old_wallet_marker, pix_card, path, 'Pix card before ledger')
write(path, s)

print('Collapsed admin actions and Pix patch applied')
# retrigger
