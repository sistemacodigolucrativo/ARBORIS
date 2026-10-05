from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()

old = """  const memberTree = allTrees.find(t => t.id === memberTreeId) || allTrees[0];\n  const memberPositions = allPositions.filter(p => p.tree_id === memberTreeId);\n\n  // Link for member's tree\n"""
new = """  const memberTree = allTrees.find(t => t.id === memberTreeId) || allTrees[0];\n  const memberPositions = allPositions.filter(p => p.tree_id === memberTreeId);\n  const currentUserIsTronco = Boolean(currentUser && memberTree && currentUser.role !== 'admin' && memberTree.tronco_user_id === currentUser.id);\n  const currentUserHasPixConfigured = Boolean(currentUser?.pixHolderName && currentUser?.pixKeyType && currentUser?.pixKey);\n  const currentUserPixLock = Boolean(currentUserIsTronco && !currentUserHasPixConfigured);\n\n  useEffect(() => {\n    if (!currentUserPixLock) return;\n    setShowLandingPage(false);\n    setIsLocked(false);\n    setActivationModalData(null);\n    if (currentView !== 'member') setCurrentView('member');\n    if (memberTab !== 'wallet') setMemberTab('wallet');\n  }, [currentUserPixLock, currentView, memberTab]);\n\n  const enforceTroncoPixLock = () => {\n    setCurrentView('member');\n    setMemberTab('wallet');\n    showToast('Configure sua chave Pix de recebimento para liberar as outras opções.');\n  };\n\n  // Link for member's tree\n"""
if old not in text:
    raise SystemExit('anchor memberTree/memberPositions not found')
text = text.replace(old, new, 1)

old = """    const tronco = allUsers.find(u => u.id === memberTree.tronco_user_id);\n    if (!tronco) {\n"""
new = """    const troncoPosition = memberPositions.find(p => p.position_index === 0 && p.user_id);\n    const troncoUserId = troncoPosition?.user_id || memberTree.tronco_user_id;\n    const tronco = allUsers.find(u => u.id === troncoUserId);\n    if (!tronco) {\n"""
if old not in text:
    raise SystemExit('anchor handleOpenActivationModal tronco lookup not found')
text = text.replace(old, new, 1)

old = """              <button\n                onClick={() => {\n                  setShowLandingPage(false);\n                  setIsLocked(false);\n                  setCurrentView('public');\n                }}\n                title=\"Regras e dinâmica do jogo\"\n"""
new = """              <button\n                onClick={() => {\n                  if (currentUserPixLock) {\n                    enforceTroncoPixLock();\n                    return;\n                  }\n                  setShowLandingPage(false);\n                  setIsLocked(false);\n                  setCurrentView('public');\n                }}\n                title=\"Regras e dinâmica do jogo\"\n"""
if old not in text:
    raise SystemExit('anchor Como Funciona button not found')
text = text.replace(old, new, 1)

old = """            <div className=\"space-y-4 animate-in fade-in duration-150\">\n              {/* Member Sub-Navigation */}\n"""
new = """            <div className=\"space-y-4 animate-in fade-in duration-150\">\n              {currentUserPixLock && (\n                <div className=\"p-3.5 bg-rose-950/60 border border-rose-500/70 rounded-2xl text-xs text-rose-100 leading-relaxed font-semibold\">\n                  Agora você está no tronco e precisa configurar sua chave Pix de recebimento. Você não será capaz de sair dessa tela se não fizer essa configuração.\n                </div>\n              )}\n              {/* Member Sub-Navigation */}\n"""
if old not in text:
    raise SystemExit('anchor member view root not found')
text = text.replace(old, new, 1)

old = """                <button\n                  onClick={() => setMemberTab('my_tree')}\n                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1.5 ${\n                    memberTab === 'my_tree' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'\n                  }`}\n                >\n"""
new = """                <button\n                  onClick={() => {\n                    if (currentUserPixLock) {\n                      enforceTroncoPixLock();\n                      return;\n                    }\n                    setMemberTab('my_tree');\n                  }}\n                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1.5 ${\n                    memberTab === 'my_tree' ? 'bg-slate-800 text-emerald-400 shadow-sm' : currentUserPixLock ? 'text-slate-600 cursor-not-allowed opacity-60' : 'text-slate-400 hover:text-slate-200'\n                  }`}\n                >\n"""
if old not in text:
    raise SystemExit('anchor member my_tree tab not found')
text = text.replace(old, new, 1)

old = """                <button\n                  onClick={() => setMemberTab('marketing')}\n                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1.5 ${\n                    memberTab === 'marketing' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'\n                  }`}\n                >\n"""
new = """                <button\n                  onClick={() => {\n                    if (currentUserPixLock) {\n                      enforceTroncoPixLock();\n                      return;\n                    }\n                    setMemberTab('marketing');\n                  }}\n                  className={`flex-1 py-1.5 rounded-lg font-medium transition text-center flex items-center justify-center gap-1.5 ${\n                    memberTab === 'marketing' ? 'bg-slate-800 text-emerald-400 shadow-sm' : currentUserPixLock ? 'text-slate-600 cursor-not-allowed opacity-60' : 'text-slate-400 hover:text-slate-200'\n                  }`}\n                >\n"""
if old not in text:
    raise SystemExit('anchor member marketing tab not found')
text = text.replace(old, new, 1)

old = """              {memberTab === 'wallet' && (\n                <div className=\"space-y-4\">\n                  <div className=\"bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between\">\n"""
new = """              {memberTab === 'wallet' && (\n                <div className=\"space-y-4\">\n                  {currentUserPixLock && (\n                    <div className=\"p-3.5 bg-rose-950/70 border-2 border-rose-500 rounded-2xl text-xs text-rose-100 leading-relaxed font-semibold shadow-lg\">\n                      Agora você está no tronco e precisa configurar sua chave Pix de recebimento. Você não será capaz de sair dessa tela se não fizer essa configuração.\n                    </div>\n                  )}\n                  <div className=\"bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between\">\n"""
if old not in text:
    raise SystemExit('anchor wallet tab body not found')
text = text.replace(old, new, 1)

path.write_text(text)
print('tronco pix lock patch applied')
