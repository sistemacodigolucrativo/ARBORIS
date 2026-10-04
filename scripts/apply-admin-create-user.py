from pathlib import Path

path = Path('src/App.tsx')
s = path.read_text()

def replace_once(old: str, new: str) -> None:
    global s
    if old not in s:
        raise SystemExit(f'Pattern not found:\n{old[:200]}')
    s = s.replace(old, new, 1)

replace_once(
    "const [adminTab, setAdminTab] = useState<'global_trees' | 'members' | 'settings' | 'audit'>('global_trees');",
    "const [adminTab, setAdminTab] = useState<'global_trees' | 'create_user' | 'members' | 'settings' | 'audit'>('global_trees');"
)

replace_once(
"""  // Create tree form (organizador)
  const [newTreeCatId, setNewTreeCatId] = useState<number>(1);
  const [newTreeTroncoId, setNewTreeTroncoId] = useState<number>(2);
""",
"""  // Create tree form (organizador)
  const [newTreeCatId, setNewTreeCatId] = useState<number>(1);
  const [newTreeTroncoId, setNewTreeTroncoId] = useState<number>(2);

  // Admin create-user flow: same validation and registration path as public entry
  const [adminIndicadorInput, setAdminIndicadorInput] = useState<string>('');
  const [adminValidatedIndicadorData, setAdminValidatedIndicadorData] = useState<any | null>(null);
  const [adminCreateFirstName, setAdminCreateFirstName] = useState<string>('');
  const [adminCreateLastName, setAdminCreateLastName] = useState<string>('');
  const [adminCreateUserLoading, setAdminCreateUserLoading] = useState<boolean>(false);
  const [adminCreateUserError, setAdminCreateUserError] = useState<string | null>(null);
"""
)

replace_once(
"""  // ATOMIC POSITION CLAIM & STRENGTHENING:
  // \"Transferir 25 Sementes para fortalecer o tronco\"
""",
"""  const handleAdminValidateIndicador = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminIndicadorInput.trim()) {
      setAdminCreateUserError('Informe o usuário indicador antes de continuar.');
      return;
    }

    setAdminCreateUserLoading(true);
    setAdminCreateUserError(null);
    try {
      const val = dataStore.validateIndicador(adminIndicadorInput.trim());
      if (val.success && val.data) {
        setAdminValidatedIndicadorData(val.data);
        showToast(`✓ Indicador validado: @${val.data.username}`);
      } else {
        setAdminValidatedIndicadorData(null);
        setAdminCreateUserError(val.error || 'Indicador inválido.');
      }
    } catch (err: any) {
      setAdminValidatedIndicadorData(null);
      setAdminCreateUserError('Erro ao validar indicador: ' + err.message);
    } finally {
      setAdminCreateUserLoading(false);
    }
  };

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

    setAdminCreateUserLoading(true);
    setAdminCreateUserError(null);
    try {
      const res = await dataStore.registerParticipant({
        indicadorUsername: adminValidatedIndicadorData.username,
        firstName: adminCreateFirstName.trim(),
        lastName: adminCreateLastName.trim()
      });

      if (res.success && res.result) {
        openActionRequest(res.result.request_url);
        showToast(`Solicitação de criação aberta para ${res.result.full_name}.`);
        setAdminCreateUserError('Solicitação online aberta no GitHub. Envie a issue para a Action validar e gravar o cadastro nos JSONs.');
        setAdminCreateFirstName('');
        setAdminCreateLastName('');
      } else {
        setAdminCreateUserError(res.error || 'Falha ao criar usuário pelo painel administrativo.');
      }
    } catch (err: any) {
      setAdminCreateUserError('Erro ao criar usuário: ' + err.message);
    } finally {
      setAdminCreateUserLoading(false);
    }
  };

  // ATOMIC POSITION CLAIM & STRENGTHENING:
  // \"Transferir 25 Sementes para fortalecer o tronco\"
"""
)

replace_once(
"""                <button
                  onClick={() => setAdminTab('members')}
""",
"""                <button
                  onClick={() => setAdminTab('create_user')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1 ${
                    adminTab === 'create_user' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserCheck className=\"w-3.5 h-3.5\" />
                  <span>Criar</span>
                </button>

                <button
                  onClick={() => setAdminTab('members')}
"""
)

replace_once(
"""              {/* SUB-TAB: MEMBROS */}
              {adminTab === 'members' && (
""",
"""              {/* SUB-TAB: CRIAR USUÁRIO */}
              {adminTab === 'create_user' && (
                <div className=\"space-y-3\">
                  <div className=\"p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1\">
                    <div className=\"text-xs font-bold text-slate-100 flex items-center gap-1.5\">
                      <UserCheck className=\"w-4 h-4 text-amber-400\" />
                      <span>Criar usuário pelo painel</span>
                    </div>
                    <p className=\"text-[11px] text-slate-400 leading-relaxed\">
                      Use o mesmo passo a passo do cadastro comum: valide o usuário indicador, preencha nome e sobrenome e abra a solicitação online para gravar nos JSONs.
                    </p>
                  </div>

                  <form onSubmit={handleAdminValidateIndicador} className=\"p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3\">
                    <div className=\"space-y-1.5\">
                      <label className=\"text-[10px] uppercase tracking-wide text-slate-500 font-bold\">Usuário indicador</label>
                      <input
                        type=\"text\"
                        value={adminIndicadorInput}
                        onChange={(e) => {
                          setAdminIndicadorInput(e.target.value);
                          setAdminValidatedIndicadorData(null);
                        }}
                        placeholder=\"username do indicador\"
                        className=\"w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500\"
                      />
                    </div>

                    <button
                      type=\"submit\"
                      disabled={adminCreateUserLoading}
                      className=\"w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-100 font-bold text-xs transition flex items-center justify-center gap-2\"
                    >
                      {adminCreateUserLoading ? <RefreshCw className=\"w-3.5 h-3.5 animate-spin\" /> : <CheckCircle2 className=\"w-3.5 h-3.5\" />}
                      <span>Validar indicador</span>
                    </button>
                  </form>

                  {adminValidatedIndicadorData && (
                    <form onSubmit={handleAdminCreateUser} className=\"p-3.5 bg-slate-900 border border-amber-800/60 rounded-2xl space-y-3\">
                      <div className=\"p-2.5 bg-amber-950/30 border border-amber-800/60 rounded-xl text-[11px] text-amber-100\">
                        Indicador validado: <strong>@{adminValidatedIndicadorData.username}</strong> · Árvore <strong>{adminValidatedIndicadorData.tree_code}</strong>
                      </div>

                      <div className=\"grid grid-cols-1 gap-2\">
                        <div className=\"space-y-1.5\">
                          <label className=\"text-[10px] uppercase tracking-wide text-slate-500 font-bold\">Nome</label>
                          <input
                            type=\"text\"
                            value={adminCreateFirstName}
                            onChange={(e) => setAdminCreateFirstName(e.target.value)}
                            placeholder=\"Nome do usuário\"
                            className=\"w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500\"
                          />
                        </div>

                        <div className=\"space-y-1.5\">
                          <label className=\"text-[10px] uppercase tracking-wide text-slate-500 font-bold\">Sobrenome</label>
                          <input
                            type=\"text\"
                            value={adminCreateLastName}
                            onChange={(e) => setAdminCreateLastName(e.target.value)}
                            placeholder=\"Sobrenome do usuário\"
                            className=\"w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-500\"
                          />
                        </div>
                      </div>

                      <button
                        type=\"submit\"
                        disabled={adminCreateUserLoading}
                        className=\"w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2\"
                      >
                        {adminCreateUserLoading ? <RefreshCw className=\"w-3.5 h-3.5 animate-spin\" /> : <PlusCircle className=\"w-3.5 h-3.5\" />}
                        <span>Criar solicitação de usuário</span>
                      </button>
                    </form>
                  )}

                  {adminCreateUserError && (
                    <div className=\"p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-300 leading-relaxed\">
                      {adminCreateUserError}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB: MEMBROS */}
              {adminTab === 'members' && (
"""
)

path.write_text(s)
print('Admin create-user patch applied to src/App.tsx')
