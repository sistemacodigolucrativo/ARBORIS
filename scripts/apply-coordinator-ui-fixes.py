from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
app_path = ROOT / 'src' / 'App.tsx'
actions_path = ROOT / 'server' / 'actions.ts'
direct_path = ROOT / 'src' / 'services' / 'directAdminActions.ts'
env_prod_path = ROOT / '.env.production'

def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'Bloco não encontrado: {label}')
    return text.replace(old, new, 1)

# -----------------------------
# Frontend / App.tsx
# -----------------------------
app = app_path.read_text(encoding='utf-8')

# Remove top tagline.
app = app.replace(
    '                <span className="text-[10px] text-slate-400 leading-tight">Comunidade de 15 Posições & Sementes</span>\n',
    ''
)

# Remove duplicate/unclear lock button from the top bar. The explicit Sair button remains responsible for logout.
app = re.sub(
    r'\n\s*\{\/\* Lock screen \/ Exit button \*\/\}\n\s*<button\n\s*onClick=\{\(\) => \{\n\s*setIsLocked\(true\);\n\s*showToast\(\'Tela de bloqueio ativada\.\'\);\n\s*\}\}\n\s*title="Bloquear Acesso \/ Tela Inicial"\n\s*className="[^"]*"\n\s*>\n\s*<Lock className="w-3\.5 h-3\.5" \/>\n\s*<span className="text-\[10px\]">Bloquear<\/span>\n\s*<\/button>\n',
    '\n',
    app,
    count=1,
)

# Remove the redundant refresh icon button. Keep only the explicit Atualizar action.
app = re.sub(
    r'\n\s*<button\n\s*onClick=\{\(\) => fetchState\(false\)\}\n\s*title="Recarregar dados"\n\s*className="[^"]*"\n\s*>\n\s*<RefreshCw className=\{`w-3\.5 h-3\.5 \$\{loading \? \'animate-spin\' : \'\'\}`\} \/>\n\s*<\/button>\n',
    '\n',
    app,
    count=1,
)

# Restrict manual forced refresh to the coordinator/admin view.
old_refresh = '''              <button
                onClick={() => {
                  fetchState(true);
                  showToast('Dados atualizados.');
                }}
                title="Atualizar dados do servidor"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">Atualizar</span>
              </button>
'''
new_refresh = '''              {currentView === 'admin' && (
                <button
                  onClick={() => {
                    fetchState(true);
                    showToast('Dados atualizados.');
                  }}
                  title="Atualizar dados do servidor"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[10px]">Atualizar</span>
                </button>
              )}
'''
app = replace_once(app, old_refresh, new_refresh, 'botão Atualizar')

# Keep the book icon inside the logged session. It must open rules, not the public landing page.
old_book = '''              <button
                onClick={() => setShowLandingPage(true)}
                title="Página pública explicativa sobre as regras e dinâmica do jogo"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs flex items-center gap-1 transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">Como Funciona</span>
              </button>
'''
new_book = '''              <button
                onClick={() => {
                  setShowLandingPage(false);
                  setIsLocked(false);
                  setCurrentView('public');
                }}
                title="Regras e dinâmica do jogo"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs flex items-center gap-1 transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">Como Funciona</span>
              </button>
'''
app = replace_once(app, old_book, new_book, 'ícone de livro')

# Prevent coordinator/admin from being restored into the member tree panel after F5/local UI state.
insert_after = '''  useEffect(() => {
    persistStoredUiState({
      showLandingPage,
      isLocked,
      currentView,
      selectedTreeModel,
      memberTab,
      adminTab,
      selectedAdminTreeId
    });
  }, [showLandingPage, isLocked, currentView, selectedTreeModel, memberTab, adminTab, selectedAdminTreeId, currentUser]);
'''
admin_redirect_effect = '''
  useEffect(() => {
    if (currentUser?.role === 'admin' && currentView === 'member') {
      setCurrentView('admin');
    }
  }, [currentUser, currentView]);
'''
if admin_redirect_effect.strip() not in app:
    app = replace_once(app, insert_after, insert_after + admin_redirect_effect, 'efeito para ocultar painel de membro do coordenador')

# Map old stored admin tabs to valid visible tabs.
old_admin_state = '''  const [adminTab, setAdminTab] = useState<'global_trees' | 'create_user' | 'members' | 'settings' | 'audit'>(() => {
    const stored = initialUiState.adminTab;
    return stored === 'global_trees' || stored === 'create_user' || stored === 'members' || stored === 'settings' || stored === 'audit' ? stored : 'global_trees';
  });
'''
new_admin_state = '''  const [adminTab, setAdminTab] = useState<'global_trees' | 'create_user' | 'members' | 'settings' | 'audit'>(() => {
    const stored = initialUiState.adminTab;
    if (stored === 'create_user') return 'members';
    if (stored === 'audit') return 'global_trees';
    return stored === 'global_trees' || stored === 'members' || stored === 'settings' ? stored : 'global_trees';
  });
'''
app = replace_once(app, old_admin_state, new_admin_state, 'estado inicial de abas admin')

# Remove separate Criar tab from coordinator navigation. Creation is unified into Membros.
app = re.sub(
    r'\n\s*<button\n\s*onClick=\{\(\) => setAdminTab\(\'create_user\'\)\}\n\s*className=\{`flex-1 py-1\.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 \$\{\n\s*adminTab === \'create_user\' \? \'bg-slate-800 text-amber-400 shadow-sm\' : \'text-slate-400 hover:text-slate-200\'\n\s*\}`\}\n\s*>\n\s*<UserCheck className="w-3\.5 h-3\.5" \/>\n\s*<span>Criar<\/span>\n\s*<\/button>\n',
    '\n',
    app,
    count=1,
)

# Remove Auditoria from coordinator navigation.
app = re.sub(
    r'\n\s*<button\n\s*onClick=\{\(\) => setAdminTab\(\'audit\'\)\}\n\s*className=\{`flex-1 py-1\.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 \$\{\n\s*adminTab === \'audit\' \? \'bg-slate-800 text-amber-400 shadow-sm\' : \'text-slate-400 hover:text-slate-200\'\n\s*\}`\}\n\s*>\n\s*<Activity className="w-3\.5 h-3\.5" \/>\n\s*<span>Auditoria<\/span>\n\s*<\/button>\n',
    '\n',
    app,
    count=1,
)

# Show the create-user form inside Membros instead of a separate Criar tab.
app = replace_once(app, "{adminTab === 'create_user' && (", "{adminTab === 'members' && (", 'unificar criar usuário em membros')
app = app.replace('                      Valide o indicador e preencha nome, sobrenome e senha para criar a conta.', '                      Preencha nome, sobrenome e senha para criar a conta. Não é necessário informar usuário indicador.')

# Remove the admin indicator validation form and open the user form directly.
app = re.sub(
    r'\n\s*<form onSubmit=\{handleAdminValidateIndicador\} className="p-3\.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">.*?\n\s*<\/form>\n\n\s*\{adminValidatedIndicadorData && \(\n\s*<form onSubmit=\{handleAdminCreateUser\}',
    '\n                  <form onSubmit={handleAdminCreateUser}',
    app,
    count=1,
    flags=re.S,
)

# Remove the now-unnecessary "Indicador validado" banner.
app = re.sub(
    r'\n\s*<div className="p-2\.5 bg-amber-950\/30 border border-amber-800\/60 rounded-xl text-\[11px\] text-amber-100">\n\s*Indicador validado: <strong>@\{adminValidatedIndicadorData\.username\}<\/strong> · Árvore <strong>\{adminValidatedIndicadorData\.tree_code\}<\/strong>\n\s*<\/div>\n',
    '\n',
    app,
    count=1,
)

# Remove the dangling close of the removed indicator conditional.
app = replace_once(app, '''                    </form>
                  )}

                  {adminCreateUserError && (''', '''                    </form>

                  {adminCreateUserError && (''', 'fechamento condicional indicador admin')

# Create user handler no longer requires indicator validation.
app = re.sub(
    r"\nconst handleAdminCreateUser = async \(e: React\.FormEvent\) => \{\n  e\.preventDefault\(\);\n  if \(!adminValidatedIndicadorData\) \{\n    setAdminCreateUserError\('Valide o indicador antes de criar o usuário\.'\);\n    return;\n  \}",
    "\nconst handleAdminCreateUser = async (e: React.FormEvent) => {\n  e.preventDefault();",
    app,
    count=1,
)
app = app.replace("      indicadorUsername: adminValidatedIndicadorData.username,\n", "")
# Do not reset removed validation state on success.
app = app.replace("      setAdminValidatedIndicadorData(null);\n", "")

# Category option label: only 25/50/100 sementes, no duplicated category text.
app = app.replace(
    "                      {cat.name} ({cat.token_requirement} Sementes)",
    "                      {cat.token_requirement} sementes"
)

# User options: show only the member name in dropdowns.
app = app.replace(
    "                          {user.full_name || user.username} (@{user.username})",
    "                          {user.full_name || user.username}"
)
app = app.replace(
    "                      {u.full_name || u.username} (@{u.username})",
    "                      {u.full_name || u.username}"
)

# Do not show the member tree tab for coordinator/admin in the persistent bottom bar.
app = re.sub(
    r'\n\s*<button\n\s*onClick=\{\(\) => setCurrentView\(\'member\'\)\}([\s\S]*?<span className="text-\[10px\]">Membro<\/span>\n\s*<\/button>)',
    lambda m: "\n          {currentUser?.role !== 'admin' && (\n            <button\n              onClick={() => setCurrentView('member')}" + m.group(1) + "\n            )}",
    app,
    count=1,
)

app_path.write_text(app, encoding='utf-8')

# -----------------------------
# Frontend service / direct admin actions
# -----------------------------
direct = direct_path.read_text(encoding='utf-8')
direct = replace_once(
    direct,
    "export function createUserDirect({ indicadorUsername, firstName, lastName, password }: { indicadorUsername: string; firstName: string; lastName: string; password: string } & ActorParams) {\n  return apiMutation('/admin/users', { indicadorUsername, firstName, lastName, password });\n}\n",
    "export function createUserDirect({ indicadorUsername, firstName, lastName, password }: { indicadorUsername?: string; firstName: string; lastName: string; password: string } & ActorParams) {\n  return apiMutation('/admin/users', {\n    firstName,\n    lastName,\n    password,\n    ...(indicadorUsername?.trim() ? { indicadorUsername: indicadorUsername.trim() } : {})\n  });\n}\n",
    'createUserDirect indicador opcional'
)
direct_path.write_text(direct, encoding='utf-8')

# -----------------------------
# Backend / registration without manual indicator for admin-created users
# -----------------------------
actions = actions_path.read_text(encoding='utf-8')
actions = replace_once(
    actions,
    "export const registrationSchema = z.object({ firstName: text, lastName: text, indicadorUsername: z.string().trim().min(1).max(200), password: passwordSchema }).strict();",
    "export const registrationSchema = z.object({ firstName: text, lastName: text, indicadorUsername: z.string().trim().min(1).max(200).optional(), password: passwordSchema }).strict();",
    'registrationSchema indicador opcional'
)
old_register_head = '''export function register(state: GameDatabaseState, params: z.infer<typeof registrationSchema>, key: string, admin?: User) {
  const base = `${params.firstName}_${params.lastName}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_]/g, '').slice(0, 80);
'''
new_register_head = '''export function register(state: GameDatabaseState, params: z.infer<typeof registrationSchema>, key: string, admin?: User) {
  let indicadorUsername = params.indicadorUsername?.trim();
  if (!indicadorUsername && admin) {
    const activeTree = state.trees.find(t => t.status === 'active');
    if (!activeTree) throw new HttpError(400, 'Não há árvore ativa para vincular o usuário criado pelo coordenador.');
    const activeReferral = state.referrals.find(r => r.treeId === activeTree.id && r.isActive);
    const tronco = state.users.find(u => u.id === activeTree.troncoUserId && u.status === 'active');
    indicadorUsername = activeReferral?.token || tronco?.username;
  }
  if (!indicadorUsername) throw new HttpError(400, 'Indicador obrigatório para cadastro público.');

  const base = `${params.firstName}_${params.lastName}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_]/g, '').slice(0, 80);
'''
actions = replace_once(actions, old_register_head, new_register_head, 'início register indicador automático admin')
actions = actions.replace('  const ref = validateReferral(state, params.indicadorUsername);', '  const ref = validateReferral(state, indicadorUsername);')
actions = actions.replace('    username, name: `${params.firstName} ${params.lastName}`, indicadorUsername: params.indicadorUsername, idempotencyKey: key });', '    username, name: `${params.firstName} ${params.lastName}`, indicadorUsername, idempotencyKey: key });')
actions = actions.replace('      indicador: params.indicadorUsername,', '      indicador: indicadorUsername,')
actions_path.write_text(actions, encoding='utf-8')

# -----------------------------
# Production frontend API base used by Vite build
# -----------------------------
env_prod_path.write_text('VITE_API_BASE_URL=/arboris-api\n', encoding='utf-8')

print('Coordinator UI/backend fixes applied.')
