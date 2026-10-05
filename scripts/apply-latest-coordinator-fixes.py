from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'Bloco não encontrado: {label}')
    return text.replace(old, new, 1)

app_path = Path('src/App.tsx')
engine_path = Path('src/services/adminGameEngine.ts')

app = app_path.read_text(encoding='utf-8')
engine = engine_path.read_text(encoding='utf-8')

old_bottom_member = """        <nav className=\"fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur border-t border-slate-800 flex items-center justify-around py-2 px-1 z-40\">\n          <button\n            onClick={() => setCurrentView('member')}\n            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${\n              currentView === 'member' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'\n            }`}\n          >\n            <Users className=\"w-5 h-5\" />\n            <span className=\"text-[10px]\">Membro</span>\n          </button>\n\n          <button\n            onClick={() => setCurrentView('public')}"""
new_bottom_member = """        <nav className=\"fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur border-t border-slate-800 flex items-center justify-around py-2 px-1 z-40\">\n          {currentUser?.role !== 'admin' && (\n            <button\n              onClick={() => setCurrentView('member')}\n              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${\n                currentView === 'member' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'\n              }`}\n            >\n              <Users className=\"w-5 h-5\" />\n              <span className=\"text-[10px]\">Membro</span>\n            </button>\n          )}\n\n          <button\n            onClick={() => setCurrentView('public')}"""
app = replace_once(app, old_bottom_member, new_bottom_member, 'ocultar botão Membro do rodapé para coordenador')

old_create_tree_block = """  const alreadyInActiveTree = state.trees.some(tree =>\n    tree.status === 'active' && tree.positions.some(pos => pos.userId === tronco.id && pos.status === 'occupied')\n  );\n  if (alreadyInActiveTree) {\n    return { success: false, state: originalState, error: 'Usuário já ocupa posição em árvore ativa.' };\n  }\n\n"""
new_create_tree_block = """  // Regra administrativa: o mesmo participante pode ocupar uma posição em várias árvores.\n  // O bloqueio global por qualquer árvore ativa impedia a criação de novas árvores com troncos válidos.\n\n"""
engine = replace_once(engine, old_create_tree_block, new_create_tree_block, 'permitir tronco em múltiplas árvores')

old_assign_block = """  const currentActiveTree = state.trees.find(item =>\n    item.status === 'active' && item.positions.some(pos => pos.userId === user.id && pos.status === 'occupied')\n  );\n  if (currentActiveTree && currentActiveTree.id !== tree.id) {\n    return { success: false, state: originalState, error: 'Usuário já ocupa posição em outra árvore ativa.' };\n  }\n\n"""
new_assign_block = """  // Regra administrativa: impedir apenas duplicidade dentro da mesma árvore.\n  // Participar de outra árvore ativa não bloqueia atribuição nesta árvore.\n\n"""
engine = replace_once(engine, old_assign_block, new_assign_block, 'permitir usuário em múltiplas árvores na atribuição')

app_path.write_text(app, encoding='utf-8')
engine_path.write_text(engine, encoding='utf-8')

print('Latest coordinator fixes applied.')
