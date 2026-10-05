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

# Topo: remover frase desnecessária.
app = app.replace('                <span className="text-[10px] text-slate-400 leading-tight">Comunidade de 15 Posições & Sementes</span>\n', '')

# Topo: remover botão Bloquear para evitar logout/bloqueio duplicado.
app = sub_once(app, r'\n\s*\{\/\* Lock screen \/ Exit button \*\/\}\n\s*<button\n\s*onClick=\{\(\) => \{\n\s*setIsLocked\(true\);\n\s*showToast\(\'Tela de bloqueio ativada\.\'\);\n\s*\}\}\n\s*title="Bloquear Acesso \/ Tela Inicial"[\s\S]*?<\/button>\n', '\n', 'remove bloquear topo')

# Topo: remover botão de refresh duplicado; manter apenas Atualizar no admin.
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

# Livro: abrir regras dentro da sessão, sem retornar para landing page/deslogar visualmente.
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

# Coordenador/admin não deve permanecer no painel de membro.
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

# Abas admin: Criar + Membros unificados em uma única aba Membros; Auditoria oculta.
app = app.replace('''  const [adminTab, setAdminTab] = useState<'global_trees' | 'create_user' | 'members' | 'settings' | 'audit'>(() => {
    const stored = initialUiState.adminTab;
    return stored === 'global_trees' || stored === 'create_user' || stored === 'members' || stored === 'settings' || stored === 'audit' ? stored : 'global_trees';
  });
''', '''  const [adminTab, setAdminTab] = useState<'global_trees' | 'create_user' | 'members' | 'settings' | 'audit'>(() => {
    const stored = initialUiState.adminTab;
    if (stored === 'members') return 'create_user';
    if (stored === 'audit') return 'global_trees';
    return stored === 'global_trees' || stored === 'create_user' || stored === 'settings' ? stored : 'global_trees';
  });
''')
app = app.replace('<span>Criar</span>', '<span>Membros</span>', 1)
app = sub_once(app, r'\n\s*<button\n\s*onClick=\{\(\) => setAdminTab\(\'members\'\)\}[\s\S]*?<span>Membros<\/span>\n\s*<\/button>\n', '\n', 'remove aba membros duplicada')
app = sub_once(app, r'\n\s*<button\n\s*onClick=\{\(\) => setAdminTab\(\'audit\'\)\}[\s\S]*?<span>Auditoria<\/span>\n\s*<\/button>\n', '\n', 'remove aba auditoria')

# Handler criar usuário: sem indicador manual.
app = sub_once(app, r"\nconst handleAdminCreateUser = async \(e: React\.FormEvent\) => \{\n  e\.preventDefault\(\);\n  if \(!adminValidatedIndicadorData\) \{\n    setAdminCreateUserError\('Valide o indicador antes de criar o usuário\.'\);\n    return;\n  \}", "\nconst handleAdminCreateUser = async (e: React.FormEvent) => {\n  e.preventDefault();", 'handler criar usuário sem indicador')
app = app.replace('      indicadorUsername: adminValidatedIndicadorData.username,\n', '')
app = app.replace('      setAdminValidatedIndicadorData(null);\n', '')

# Substituir as duas seções antigas Criar/Membros por uma seção única e válida.
new_user_members_section = r'''              {/* SUB-TAB: MEMBROS */}
              {adminTab === 'create_user' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-amber-400" />
                      <span>Criar usuário pelo painel</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Preencha nome, sobrenome e senha para criar a conta. Não é necessário informar usuário indicador.
                    </p>
                  </div>

                  <form onSubmit={handleAdminCreateUser} className="p-3.5 bg-slate-900 border border-amber-800/60 rounded-2xl space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Nome</label>
                        <input
                          type="text"
                          value={adminCreateFirstName}
                          onChange={(e) => setAdminCreateFirstName(e.target.value)}
                          placeholder="Nome do usuário"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">Sobrenome</label>
                        <input
                          type="text"
                          value={adminCreateLastName}
                          onChange={(e) => setAdminCreateLastName(e.target.value)}
                          placeholder="Sobrenome do usuário"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <label className="block text-xs text-slate-300">Senha da nova conta (mínimo 12 caracteres)
                      <input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={adminCreatePassword} onChange={e => setAdminCreatePassword(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5" />
                    </label>
                    <button
                      type="submit"
                      disabled={adminCreateUserLoading}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2"
                    >
                      {adminCreateUserLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                      <span>Criar usuário</span>
                    </button>
                  </form>

                  {adminCreateUserError && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 leading-relaxed">
                      {adminCreateUserError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-200">
                      Membros Cadastrados ({allUsers.length})
                    </div>

                    <div className="space-y-2">
                      {allUsers.map(user => (
                        <div key={user.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-100">{user.full_name || user.username}</div>
                              <div className="text-[10px] text-slate-400">@{user.username}</div>
                            </div>
                            <div className="text-right font-mono">
                              <span className="font-bold text-emerald-400">{user.balance}</span>
                              <span className="text-[9px] text-slate-500 block">sementes</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px]">
                            <span className={`px-2 py-0.5 rounded font-mono ${
                              user.status === 'active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}>
                              {user.status === 'active' ? 'Ativo' : 'Suspenso'}
                            </span>

                            {user.id !== 1 && (
                              <button
                                onClick={() => handleToggleUserStatus(user.id)}
                                className="text-slate-400 hover:text-white underline"
                              >
                                {user.status === 'active' ? 'Suspender Membro' : 'Ativar Membro'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
'''
app = sub_once(app, r'\n\s*\{\/\* SUB-TAB: CRIAR USUÁRIO \*\/\}\n\s*\{adminTab === \'create_user\' && \([\s\S]*?\n\s*\{\/\* SUB-TAB: REGRAS \*\/\}', '\n' + new_user_members_section + '\n              {/* SUB-TAB: REGRAS */}', 'substituir criar/membros', flags=re.S)

# Nomes limpos em selects de criação/movimentação de árvore.
app = app.replace('                      {cat.name} ({cat.token_requirement} Sementes)', '                      {cat.token_requirement} sementes')
app = app.replace('                          {user.full_name || user.username} (@{user.username})', '                          {user.full_name || user.username}')
app = app.replace('                      {u.full_name || u.username} (@{u.username})', '                      {u.full_name || u.username}')

app_path.write_text(app, encoding='utf-8')

# Frontend service: indicador opcional para criação admin.
direct = direct_path.read_text(encoding='utf-8')
direct = direct.replace("export function createUserDirect({ indicadorUsername, firstName, lastName, password }: { indicadorUsername: string; firstName: string; lastName: string; password: string } & ActorParams) {\n  return apiMutation('/admin/users', { indicadorUsername, firstName, lastName, password });\n}\n", "export function createUserDirect({ indicadorUsername, firstName, lastName, password }: { indicadorUsername?: string; firstName: string; lastName: string; password: string } & ActorParams) {\n  return apiMutation('/admin/users', {\n    firstName,\n    lastName,\n    password,\n    ...(indicadorUsername?.trim() ? { indicadorUsername: indicadorUsername.trim() } : {})\n  });\n}\n")
direct_path.write_text(direct, encoding='utf-8')

# Backend: cadastro admin sem indicador manual; cadastro público continua exigindo indicador.
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
print('Coordinator UI/backend fixes v3 applied.')
