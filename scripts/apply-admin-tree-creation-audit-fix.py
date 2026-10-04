from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "src" / "App.tsx"
DATA_STORE = ROOT / "src" / "services" / "dataStore.ts"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Pattern not found: {label}")
    return text.replace(old, new, 1)


app = APP.read_text()

app = replace_once(
    app,
    "  const handleStrengthenTronco = async (userId: number, treeId: number) => {\n    setActivatingTronco(true);",
    "  const handleStrengthenTronco = async (userId: number, treeId: number) => {\n    if (currentUser?.role === 'admin') {\n      showToast('Ação bloqueada: o coordenador não deve fortalecer tronco pelo painel de membro. Use Organização > Árvores > Nova Árvore.');\n      return;\n    }\n\n    setActivatingTronco(true);",
    "admin guard in handleStrengthenTronco",
)

app = replace_once(
    app,
    "                  {!isUserPositioned && currentUser.balance >= 25 && (",
    "                  {currentUser.role !== 'admin' && !isUserPositioned && currentUser.balance >= 25 && (",
    "hide member strengthen card for admin",
)

app = replace_once(
    app,
    "  const handleCreateTree = async (e: React.FormEvent) => {\n    e.preventDefault();\n    try {",
    "  const handleCreateTree = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (currentUser?.role !== 'admin') {\n      showToast('Erro: somente o coordenador pode criar árvore pelo painel administrativo.');\n      return;\n    }\n    if (currentView !== 'admin' || adminTab !== 'global_trees') {\n      showToast('Erro: a criação de árvore deve ser feita em Organização > Árvores.');\n      return;\n    }\n\n    setAdminActionMessage(null);\n    try {",
    "admin context guard in handleCreateTree",
)

APP.write_text(app)

store = DATA_STORE.read_text()
store = replace_once(
    store,
    "    if (!user) return { success: false, error: 'Usuário não encontrado.' };\n    if (!tree) return { success: false, error: 'Árvore não encontrada.' };",
    "    if (!user) return { success: false, error: 'Usuário não encontrado.' };\n    if (user.role === 'admin') {\n      return { success: false, error: 'Coordenador não pode fortalecer tronco pelo fluxo de membro. Use Organização > Árvores > Nova Árvore.' };\n    }\n    if (!tree) return { success: false, error: 'Árvore não encontrada.' };",
    "admin guard in strengthenTroncoAction",
)
DATA_STORE.write_text(store)

print('Admin tree creation audit fix applied.')
# touch: trigger workflow after creation
