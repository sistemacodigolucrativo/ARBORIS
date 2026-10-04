from pathlib import Path

p = Path('src/App.tsx')
s = p.read_text(encoding='utf-8')

if '  Trash2\n} from' not in s:
    s = s.replace("  RotateCcw\n} from 'lucide-react';", "  RotateCcw,\n  Trash2\n} from 'lucide-react';", 1)

if 'const handleDeleteTree = async (tree: Tree)' not in s:
    old = '''  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await dataStore.createTreeAction(newTreeCatId, newTreeTroncoId);
      if (res.success) {
        showToast(`✓ Nova árvore comunitária criada com sucesso (#${res.treeId})!`);
        setShowCreateTreeModal(false);
        await fetchState();
      } else {
        showToast('Erro: ' + res.error);
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    }
  };

  const handleToggleUserStatus = async (userId: number) => {
'''
    new = '''  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await dataStore.createTreeAction(newTreeCatId, newTreeTroncoId);
      if (res.success) {
        showToast(`✓ Nova árvore comunitária criada com sucesso (#${res.treeId})!`);
        setShowCreateTreeModal(false);
        await fetchState();
      } else {
        showToast('Erro: ' + res.error);
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    }
  };

  const handleDeleteTree = async (tree: Tree) => {
    const confirmed = window.confirm(`Excluir a árvore ${tree.tree_code}?`);
    if (!confirmed) return;

    try {
      const res = await dataStore.deleteTreeAction(tree.id, currentUser?.id || 1);
      if (res.success && res.result) {
        openActionRequest(res.result.request_url);
        showToast(`Solicitação de exclusão aberta para ${tree.tree_code}.`);
      } else {
        showToast('Erro: ' + (res.error || 'Não foi possível solicitar a exclusão da árvore.'));
      }
    } catch (e: any) {
      showToast('Erro: ' + e.message);
    }
  };

  const handleToggleUserStatus = async (userId: number) => {
'''
    if old not in s:
        raise SystemExit('anchor handleCreateTree not found')
    s = s.replace(old, new, 1)

if 'handleDeleteTree(tree)' not in s:
    old = '''                            <span className="text-[10px] text-amber-400 font-mono bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/80">
                              {tree.category_name}
                            </span>
'''
    new = '''                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-amber-400 font-mono bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/80">
                                {tree.category_name}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTree(tree);
                                }}
                                className="w-6 h-6 rounded-lg bg-rose-950/80 border border-rose-800/70 text-rose-300 hover:bg-rose-900 hover:text-rose-100 flex items-center justify-center transition"
                                title="Excluir árvore"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
'''
    if old not in s:
        raise SystemExit('anchor tree category not found')
    s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('ok')
