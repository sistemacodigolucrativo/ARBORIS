from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
app_path = ROOT / 'src' / 'App.tsx'
actions_path = ROOT / 'server' / 'actions.ts'
direct_path = ROOT / 'src' / 'services' / 'directAdminActions.ts'
env_prod_path = ROOT / '.env.production'

def sub_once(text: str, pattern: str, repl: str, label: str, flags=0) -> str:
    new, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count == 0:
        print(f'WARN: no match for {label}')
        return text
    return new

app = app_path.read_text(encoding='utf-8')

app = app.replace('                <span className="text-[10px] text-slate-400 leading-tight">Comunidade de 15 Posições & Sementes</span>\n', '')

app = sub_once(app, r'\n\s*\{\/\* Lock screen \/ Exit button \*\/\}\n\s*<button\n\s*onClick=\{\(\) => \{\n\s*setIsLocked\(true\);\n\s*showToast\(\'Tela de bloqueio ativada\.\'\);\n\s*\}\}\n\s*title="Bloquear Acesso \/ Tela Inicial"[\s\S]*?<\/button>\n', '\n', 'remove bloquear topo')
app = sub_once(app, r'\n\s*<button\n\s*onClick=\{\(\) => fetchState\(false\)\}\n\s*title="Recarregar dados"[\s\S]*?<\/button>\n', '\n', 'remove recarregar duplicado')

app = app.replace('''              <button
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
''', '''              {currentView === 'admin' && (
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
''')

app = app.replace('''              <button
                onClick={() => setShowLandingPage(true)}
                title="Página pública explicativa sobre as regras e dinâmica do jogo"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs flex items-center gap-1 transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">Como Funciona</span>
              </button>
''', '''              <button
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
''')

persist_block = '''  useEffect(() => {
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
redirect_effect = '''
  useEffect(() => {
    if (currentUser?.role === 'admin' && currentView === 'member') {
      setCurrentView('admin');
    }
  }, [currentUser, currentView]);
'''
if redirect_effect.strip() not in app and persist_block in app:
    app = app.replace(persist_block, persist_block + redirect_effect, 1)

app = app.replace('''  const [adminTab, setAdminTab] = useState<'global_trees' | 'create_user' | 'members' | 'settings' | 'audit'>(() => {
    const stored = initialUiState.adminTab;
    return stored === 'global_trees' || stored === 'create_user' || stored === 'members' || stored === 'settings' || stored === 'audit' ? stored : 'global_trees';
  });
''', '''  const [adminTab, setAdminTab] = useState<'global_trees' | 'create_user' | 'members' | 'settings' | 'audit'>(() => {
    const stored = initialUiState.adminTab;
    if (stored === 'create_user') return 'members';
    if (stored === 'audit') return 'global_trees';
    return stored === 'global_trees' || stored === 'members' || stored === 'settings' ? stored : 'global_trees';
  });
''')

app = sub_once(app, r'\n\s*<button\n\s*onClick=\{\(\) => setAdminTab\(\'create_user\'\)\}[\s\S]*?<span>Criar<\/span>\n\s*<\/button>\n', '\n', 'remove aba criar')
app = sub_once(app, r'\n\s*<button\n\s*onClick=\{\(\) => setAdminTab\(\'audit\'\)\}[\s\S]*?<span>Auditoria<\/span>\n\s*<\/button>\n', '\n', 'remove aba auditoria')
app = app.replace("{adminTab === 'create_user' && (", "{adminTab === 'members' && (")
app = app.replace('Valide o indicador e preencha nome, sobrenome e senha para criar a conta.', 'Preencha nome, sobrenome e senha para criar a conta. Não é necessário informar usuário indicador.')

app = sub_once(app, r'\n\s*<form onSubmit=\{handleAdminValidateIndicador\}[\s\S]*?<\/form>\n\n\s*\{adminValidatedIndicadorData && \(\n\s*<form onSubmit=\{handleAdminCreateUser\}', '\n                  <form onSubmit={handleAdminCreateUser}', 'remove validação indicador admin')
app = sub_once(app, r'\n\s*<div className="p-2\.5 bg-amber-950\/30[\s\S]*?Indicador validado:[\s\S]*?<\/div>\n', '\n', 'remove banner indicador validado')
app = app.replace('''                    </form>
                  )}

                  {adminCreateUserError && (''', '''                    </form>

                  {adminCreateUserError && (''')
app = sub_once(app, r"\nconst handleAdminCreateUser = async \(e: React\.FormEvent\) => \{\n  e\.preventDefault\(\);\n  if \(!adminValidatedIndicadorData\) \{\n    setAdminCreateUserError\('Valide o indicador antes de criar o usuário\.'\);\n    return;\n  \}", "\nconst handleAdminCreateUser = async (e: React.FormEvent) => {\n  e.preventDefault();", 'handler sem indicador')
app = app.replace('      indicadorUsername: adminValidatedIndicadorData.username,\n', '')
app = app.replace('      setAdminValidatedIndicadorData(null);\n', '')
app = app.replace('                      {cat.name} ({cat.token_requirement} Sementes)', '                      {cat.token_requirement} sementes')
app = app.replace('                          {user.full_name || user.username} (@{user.username})', '                          {user.full_name || user.username}')
app = app.replace('                      {u.full_name || u.username} (@{u.username})', '                      {u.full_name || u.username}')
app = sub_once(app, r'\n\s*<button\n\s*onClick=\{\(\) => setCurrentView\(\'member\'\)\}([\s\S]*?<span className="text-\[10px\]">Membro<\/span>\n\s*<\/button>)', lambda m: "\n          {currentUser?.role !== 'admin' && (\n            <button\n              onClick={() => setCurrentView('member')}" + m.group(1) + "\n            )}", 'ocultar membro para admin')

app_path.write_text(app, encoding='utf-8')

# directAdminActions: indicador opcional
direct = direct_path.read_text(encoding='utf-8')
direct = direct.replace("export function createUserDirect({ indicadorUsername, firstName, lastName, password }: { indicadorUsername: string; firstName: string; lastName: string; password: string } & ActorParams) {\n  return apiMutation('/admin/users', { indicadorUsername, firstName, lastName, password });\n}\n", "export function createUserDirect({ indicadorUsername, firstName, lastName, password }: { indicadorUsername?: string; firstName: string; lastName: string; password: string } & ActorParams) {\n  return apiMutation('/admin/users', {\n    firstName,\n    lastName,\n    password,\n    ...(indicadorUsername?.trim() ? { indicadorUsername: indicadorUsername.trim() } : {})\n  });\n}\n")
direct_path.write_text(direct, encoding='utf-8')

# server/actions: admin can create user without manual indicator
actions = actions_path.read_text(encoding='utf-8')
actions = actions.replace("export const registrationSchema = z.object({ firstName: text, lastName: text, indicadorUsername: z.string().trim().min(1).max(200), password: passwordSchema }).strict();", "export const registrationSchema = z.object({ firstName: text, lastName: text, indicadorUsername: z.string().trim().min(1).max(200).optional(), password: passwordSchema }).strict();")
fn_open = "export function register(state: GameDatabaseState, params: z.infer<typeof registrationSchema>, key: string, admin?: User) {\n"
insert = "export function register(state: GameDatabaseState, params: z.infer<typeof registrationSchema>, key: string, admin?: User) {\n  let indicadorUsername = params.indicadorUsername?.trim();\n  if (!indicadorUsername && admin) {\n    const activeTree = state.trees.find(t => t.status === 'active');\n    if (!activeTree) throw new HttpError(400, 'Não há árvore ativa para vincular o usuário criado pelo coordenador.');\n    const activeReferral = state.referrals.find(r => r.treeId === activeTree.id && r.isActive);\n    const tronco = state.users.find(u => u.id === activeTree.troncoUserId && u.status === 'active');\n    indicadorUsername = activeReferral?.token || tronco?.username;\n  }\n  if (!indicadorUsername) throw new HttpError(400, 'Indicador obrigatório para cadastro público.');\n"
if 'let indicadorUsername = params.indicadorUsername?.trim();' not in actions:
    actions = actions.replace(fn_open, insert, 1)
actions = actions.replace('  const ref = validateReferral(state, params.indicadorUsername);', '  const ref = validateReferral(state, indicadorUsername);')
actions = actions.replace('    username, name: `${params.firstName} ${params.lastName}`, indicadorUsername: params.indicadorUsername, idempotencyKey: key });', '    username, name: `${params.firstName} ${params.lastName}`, indicadorUsername, idempotencyKey: key });')
actions = actions.replace('      indicador: params.indicadorUsername,', '      indicador: indicadorUsername,')
actions_path.write_text(actions, encoding='utf-8')

env_prod_path.write_text('VITE_API_BASE_URL=/arboris-api\n', encoding='utf-8')
print('Coordinator UI/backend fixes v2 applied.')
