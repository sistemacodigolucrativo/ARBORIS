<?php
$title = "Entrar";
ob_start();
?>
<div class="max-w-md mx-auto my-8">
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div class="text-center mb-6">
            <div class="inline-flex w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 items-center justify-center text-2xl mb-2">
                🌲
            </div>
            <h1 class="text-xl font-bold text-slate-100">Acesse o Arboris</h1>
            <p class="text-xs text-slate-400 mt-1">Entre com seu usuário ou e-mail cadastrado</p>
        </div>

        <form action="/login" method="POST" class="space-y-4">
            <?= $csrfField ?>

            <div>
                <label for="identifier" class="block text-xs font-medium text-slate-300 mb-1">Usuário ou E-mail</label>
                <input type="text" id="identifier" name="identifier" required autocomplete="username"
                       placeholder="ex: maria ou maria@email.com"
                       class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition">
            </div>

            <div>
                <label for="password" class="block text-xs font-medium text-slate-300 mb-1">Senha</label>
                <input type="password" id="password" name="password" required autocomplete="current-password"
                       placeholder="••••••••"
                       class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition">
            </div>

            <button type="submit"
                    class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition shadow-lg shadow-emerald-900/40">
                Entrar no Sistema
            </button>
        </form>

        <div class="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <p class="text-xs text-slate-400">
                Ainda não tem convite? O acesso é gratuito exclusivamente via link de indicação de um participante.
            </p>
        </div>
    </div>
</div>
<?php
$content = ob_get_clean();
include __DIR__ . '/../layout.php';
?>
