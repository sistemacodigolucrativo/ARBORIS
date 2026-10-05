from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text(encoding='utf-8')

old = '''        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur border-t border-slate-800 flex items-center justify-around py-2 px-1 z-40">
          {currentUser?.role !== 'admin' && (
            <button
              onClick={() => setCurrentView('member')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                currentView === 'member' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px]">Membro</span>
            </button>
          )}

          <button
'''

new = '''        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur border-t border-slate-800 flex items-center justify-around py-2 px-1 z-40">
          <button
'''

if old not in text:
    raise SystemExit('Expected bottom bar member button block not found')

text = text.replace(old, new, 1)

# Guard against this exact regression reappearing in the persistent bottom bar.
bottom_bar = text.split('{/* Persistent Bottom Bar */}', 1)[1]
if '>Membro</span>' in bottom_bar or '>Usuários</span>' in bottom_bar or '>Membros</span>' in bottom_bar:
    raise SystemExit('Member/users button still present in persistent bottom bar')

path.write_text(text, encoding='utf-8')
print('Removed member/users button from collaborator persistent bottom bar.')
