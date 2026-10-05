from pathlib import Path
import re

ROOT = Path('.')

def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')

def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding='utf-8')

def replace_once(content: str, old: str, new: str, label: str) -> str:
    if old not in content:
        raise SystemExit(f'Missing anchor: {label}')
    return content.replace(old, new, 1)

# -----------------------------------------------------------------------------
# server/actions.ts — admin action to edit member profile + Pix
# -----------------------------------------------------------------------------
path = 'server/actions.ts'
text = read(path)

text = replace_once(
    text,
    "const pixKeySchema = z.string().trim().min(1).max(200);\n",
    "const pixKeySchema = z.string().trim().min(1).max(200);\n"
    "const adminMemberNameSchema = z.string().trim().min(1).max(120);\n"
    "const adminMemberUsernameSchema = z.string().trim().min(3).max(80);\n"
    "const adminMemberPixHolderSchema = z.string().trim().max(120).optional();\n"
    "const adminMemberPixKeySchema = z.string().trim().max(200).optional();\n",
    'actions schemas'
)

text = replace_once(
    text,
    "  z.object({ action: z.literal('clear_pix'), params: z.object({}).strict() }),\n",
    "  z.object({ action: z.literal('clear_pix'), params: z.object({}).strict() }),\n"
    "  z.object({ action: z.literal('admin_update_member'), params: z.object({ userId: id, name: adminMemberNameSchema, username: adminMemberUsernameSchema, pixHolderName: adminMemberPixHolderSchema, pixKeyType: pixKeyTypeSchema.nullable().optional(), pixKey: adminMemberPixKeySchema }).strict() }),\n",
    'action schema admin_update_member'
)

admin_case = r"""
    case 'admin_update_member': {
      if (user.role !== 'admin') throw new HttpError(403, 'Acesso administrativo obrigatório.');
      const next = structuredClone(state);
      const target = next.users.find(u => u.id === input.params.userId);
      if (!target || target.role === 'admin') return { success: false, state, error: 'Membro inexistente ou protegido.' };

      const cleanUsername = input.params.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (cleanUsername.length < 3) return { success: false, state, error: 'Arroba inválido. Use pelo menos 3 caracteres.' };
      if (next.users.some(u => u.id !== target.id && u.username.toLowerCase() === cleanUsername)) {
        return { success: false, state, error: `O arroba @${cleanUsername} já está em uso.` };
      }

      const cleanName = input.params.name.trim();
      const pixHolderName = input.params.pixHolderName?.trim() || null;
      const pixKey = input.params.pixKey?.trim() || null;
      const pixKeyType = pixKey ? (input.params.pixKeyType || 'random') : null;
      const hasAnyPixField = Boolean(input.params.pixHolderName?.trim() || input.params.pixKeyType || input.params.pixKey?.trim());
      if (hasAnyPixField && (!pixHolderName || !pixKey || !pixKeyType)) {
        return { success: false, state, error: 'Para salvar Pix, informe titular, tipo e chave. Para remover Pix, deixe os campos em branco.' };
      }

      const previous = {
        username: target.username,
        name: target.name,
        pixKeyType: target.pixKeyType || null
      };
      const now = new Date().toISOString();
      target.username = cleanUsername;
      target.name = cleanName;
      target.pixHolderName = pixHolderName;
      target.pixKeyType = pixKeyType;
      target.pixKey = pixKey;
      target.updatedAt = now;

      for (const tree of next.trees) {
        for (const position of tree.positions) {
          if (position.userId === target.id) {
            position.username = cleanUsername;
            position.name = cleanName;
          }
        }
      }

      for (const request of next.activationRequests || []) {
        if (request.requesterUserId === target.id) request.requesterUsername = cleanUsername;
        if (request.troncoUserId === target.id) request.troncoUsername = cleanUsername;
      }

      for (const entry of next.ledger) {
        if (entry.fromUserId === target.id) entry.fromUsername = cleanUsername;
        if (entry.toUserId === target.id) entry.toUsername = cleanUsername;
      }

      next.auditLog.push({
        id: nextLocalId(next.auditLog),
        actorUserId: user.id,
        actorUsername: user.username,
        action: 'ADMIN_MEMBER_UPDATED',
        entity: 'user',
        entityId: target.id,
        metadata: { idempotencyKey: key, previous, next: { username: cleanUsername, name: cleanName, pixKeyType } },
        createdAt: now
      });

      return { success: true, state: next, result: { userId: target.id, username: target.username, name: target.name, pixHolderName: target.pixHolderName, pixKeyType: target.pixKeyType, pixKey: target.pixKey } };
    }
"""

text = replace_once(
    text,
    "    case 'request_activation': {\n",
    admin_case + "    case 'request_activation': {\n",
    'admin_update_member case'
)

write(path, text)

# -----------------------------------------------------------------------------
# src/services/directAdminActions.ts — frontend helper
# -----------------------------------------------------------------------------
path = 'src/services/directAdminActions.ts'
text = read(path)

append = r"""
export function adminUpdateMemberDirect({ userId, name, username, pixHolderName, pixKeyType, pixKey }: { userId: number; name: string; username: string; pixHolderName?: string; pixKeyType?: 'random' | 'email' | 'phone' | null; pixKey?: string } & ActorParams) {
  return apiMutation('/actions', { action: 'admin_update_member', params: { userId, name, username, pixHolderName, pixKeyType, pixKey } });
}
"""
if 'adminUpdateMemberDirect' not in text:
    text = text.rstrip() + '\n' + append
write(path, text)

# -----------------------------------------------------------------------------
# src/App.tsx — UI changes
# -----------------------------------------------------------------------------
path = 'src/App.tsx'
text = read(path)

text = replace_once(text, "  Sprout,\n", "  Sprout,\n  DollarSign,\n", 'DollarSign import')
text = replace_once(
    text,
    "  deleteUserDirect,\n  updateTreeNicknameDirect\n} from './services/directAdminActions';",
    "  deleteUserDirect,\n  updateTreeNicknameDirect,\n  adminUpdateMemberDirect\n} from './services/directAdminActions';",
    'adminUpdateMemberDirect import'
)

text = replace_once(
    text,
    "  const [adminMembersPage, setAdminMembersPage] = useState<number>(1);\n  const [adminMembersPageSize, setAdminMembersPageSize] = useState<number>(10);\n",
    "  const [adminMembersPage, setAdminMembersPage] = useState<number>(1);\n  const [adminMembersPageSize, setAdminMembersPageSize] = useState<number>(10);\n"
    "  const [adminEditingMemberId, setAdminEditingMemberId] = useState<number | null>(null);\n"
    "  const [adminEditName, setAdminEditName] = useState<string>('');\n"
    "  const [adminEditUsername, setAdminEditUsername] = useState<string>('');\n"
    "  const [adminEditPixHolderName, setAdminEditPixHolderName] = useState<string>('');\n"
    "  const [adminEditPixKeyType, setAdminEditPixKeyType] = useState<'random' | 'email' | 'phone'>('random');\n"
    "  const [adminEditPixKey, setAdminEditPixKey] = useState<string>('');\n",
    'admin edit member state'
)

member_edit_handlers = r"""
const openAdminMemberEditor = (user: User) => {
  setAdminEditingMemberId(user.id);
  setAdminEditName(user.full_name || user.username);
  setAdminEditUsername(user.username);
  setAdminEditPixHolderName(user.pixHolderName || '');
  setAdminEditPixKeyType(user.pixKeyType || 'random');
  setAdminEditPixKey(user.pixKey || '');
  setAdminActionMessage(null);
};

const handleAdminUpdateMember = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!adminEditingMemberId) return;
  if (currentUser?.role !== 'admin') {
    showToast('Erro: somente o coordenador pode editar membros.');
    return;
  }
  if (!adminEditName.trim() || !adminEditUsername.trim()) {
    showToast('Informe nome e arroba do membro.');
    return;
  }

  setAdminActionLoading(true);
  setAdminActionMessage(null);
  try {
    const hasPix = Boolean(adminEditPixHolderName.trim() || adminEditPixKey.trim());
    const res = await adminUpdateMemberDirect({
      userId: adminEditingMemberId,
      name: adminEditName.trim(),
      username: adminEditUsername.trim(),
      pixHolderName: hasPix ? adminEditPixHolderName.trim() : '',
      pixKeyType: hasPix ? adminEditPixKeyType : null,
      pixKey: hasPix ? adminEditPixKey.trim() : '',
      actorUserId: currentUser.id,
      actorUsername: currentUser.username
    });
    if (res.success) {
      await applyDirectAdminState(res);
      setAdminEditingMemberId(null);
      setAdminActionMessage('Dados do membro atualizados.');
      showToast('Dados do membro atualizados.');
    } else {
      const error = res.error || 'Não foi possível atualizar o membro.';
      setAdminActionMessage(error);
      showToast('Erro: ' + error);
    }
  } catch (e: any) {
    setAdminActionMessage('Erro ao atualizar membro: ' + e.message);
    showToast('Erro: ' + e.message);
  } finally {
    setAdminActionLoading(false);
  }
};

"""
text = replace_once(text, "\n\n  const handleReserveTreeEntry = async (treeId: number) => {", "\n\n" + member_edit_handlers + "  const handleReserveTreeEntry = async (treeId: number) => {", 'admin member edit handlers')

# Remove phrase variants from registration congratulations/copy.
text = re.sub(r'\s*elas não serão enviadas ao tronco[\.!]?', '', text, flags=re.IGNORECASE)
text = re.sub(r'\s*Elas não serão enviadas ao tronco[\.!]?', '', text)

# Rename member tab Sementes to Doação and change icon.
text = replace_once(
    text,
    "                  <Sprout className=\"w-3.5 h-3.5\" />\n                  <span>Sementes</span>",
    "                  <DollarSign className=\"w-3.5 h-3.5\" />\n                  <span>Doação</span>",
    'member tab donation label'
)

member_name_block = """                          <div className=\"flex items-center justify-between\">
                            <div>
                              <div className=\"font-bold text-slate-100\">{user.full_name || user.username}</div>
                              <div className=\"text-[10px] text-slate-400\">@{user.username}</div>
                            </div>
                            <div className=\"text-right font-mono\">
                              <span className=\"font-bold text-emerald-400\">{user.balance}</span>
                              <span className=\"text-[9px] text-slate-500 block\">sementes</span>
                            </div>
                          </div>

                          <div className=\"flex items-center justify-between pt-2 border-t border-slate-800 text-[10px]\">"""
member_name_replacement = """                          <div className=\"flex items-center justify-between\">
                            <div>
                              <button
                                type=\"button\"
                                onClick={() => openAdminMemberEditor(user)}
                                className=\"font-bold text-slate-100 hover:text-amber-300 underline-offset-2 hover:underline text-left\"
                              >
                                {user.full_name || user.username}
                              </button>
                              <div className=\"text-[10px] text-slate-400\">@{user.username}</div>
                            </div>
                            <div className=\"text-right font-mono\">
                              <span className=\"font-bold text-emerald-400\">{user.balance}</span>
                              <span className=\"text-[9px] text-slate-500 block\">sementes</span>
                            </div>
                          </div>

                          {adminEditingMemberId === user.id && (
                            <form onSubmit={handleAdminUpdateMember} className=\"p-3 bg-slate-950 border border-amber-800/60 rounded-xl space-y-3\">
                              <div className=\"grid grid-cols-1 gap-2\">
                                <label className=\"block text-[10px] text-slate-300 font-bold uppercase tracking-wide\">Nome do membro
                                  <input
                                    required
                                    value={adminEditName}
                                    onChange={(e) => setAdminEditName(e.target.value)}
                                    className=\"w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-500\"
                                  />
                                </label>
                                <label className=\"block text-[10px] text-slate-300 font-bold uppercase tracking-wide\">Arroba / username
                                  <div className=\"relative mt-1\">
                                    <span className=\"absolute left-3 top-1/2 -translate-y-1/2 text-slate-500\">@</span>
                                    <input
                                      required
                                      value={adminEditUsername}
                                      onChange={(e) => setAdminEditUsername(e.target.value)}
                                      className=\"w-full bg-slate-900 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-slate-100 font-mono outline-none focus:border-amber-500\"
                                    />
                                  </div>
                                </label>
                                <label className=\"block text-[10px] text-slate-300 font-bold uppercase tracking-wide\">Titular Pix
                                  <input
                                    value={adminEditPixHolderName}
                                    onChange={(e) => setAdminEditPixHolderName(e.target.value)}
                                    placeholder=\"Nome do titular\"
                                    className=\"w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-500\"
                                  />
                                </label>
                                <label className=\"block text-[10px] text-slate-300 font-bold uppercase tracking-wide\">Tipo da chave Pix
                                  <select
                                    value={adminEditPixKeyType}
                                    onChange={(e) => setAdminEditPixKeyType(e.target.value as 'random' | 'email' | 'phone')}
                                    className=\"w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-500\"
                                  >
                                    <option value=\"random\">Aleatória</option>
                                    <option value=\"email\">E-mail</option>
                                    <option value=\"phone\">Telefone</option>
                                  </select>
                                </label>
                                <label className=\"block text-[10px] text-slate-300 font-bold uppercase tracking-wide\">Chave Pix
                                  <input
                                    value={adminEditPixKey}
                                    onChange={(e) => setAdminEditPixKey(e.target.value)}
                                    placeholder={adminEditPixKeyType === 'email' ? 'nome@email.com' : adminEditPixKeyType === 'phone' ? '+5531999999999' : 'chave aleatória'}
                                    className=\"w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-amber-500\"
                                  />
                                </label>
                              </div>
                              <div className=\"grid grid-cols-2 gap-2\">
                                <button type=\"submit\" disabled={adminActionLoading} className=\"py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black\">
                                  Salvar
                                </button>
                                <button type=\"button\" disabled={adminActionLoading} onClick={() => setAdminEditingMemberId(null)} className=\"py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold\">
                                  Cancelar
                                </button>
                              </div>
                              <div className=\"text-[10px] text-slate-500 leading-relaxed\">
                                Para remover os dados Pix, deixe titular e chave Pix em branco e salve.
                              </div>
                            </form>
                          )}

                          <div className=\"flex items-center justify-between pt-2 border-t border-slate-800 text-[10px]\">"""
text = replace_once(text, member_name_block, member_name_replacement, 'admin member list edit form')

write(path, text)

print('Admin member edit, donation tab and registration text patch applied.')
