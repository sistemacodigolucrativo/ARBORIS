<?php
$title = "Cadastro Gratuito por Indicação";
ob_start();
?>
<div class="max-w-lg mx-auto my-6">
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div class="text-center mb-6">
            <div class="inline-flex w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 items-center justify-center text-2xl mb-2">
                🌱
            </div>
            <h1 class="text-xl font-bold text-slate-100">Cadastro de Participante</h1>
            <p class="text-xs text-slate-400 mt-1">Jogo 100% gratuito baseado em árvores e fichas virtuais</p>
        </div>

        <?php if ($linkData): ?>
            <!-- Verified Referral Summary Card -->
            <div class="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 space-y-2">
                <div class="flex items-center justify-between text-xs">
                    <span class="text-emerald-400 font-medium">Indicado por:</span>
                    <span class="text-slate-200 font-semibold"><?= e($linkData['referrer_name'] ?: $linkData['referrer_username']) ?></span>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <span class="text-emerald-400 font-medium">Categoria da Árvore:</span>
                    <span class="text-slate-200 font-semibold"><?= e($linkData['category_name']) ?></span>
                </div>
                <div class="flex items-center justify-between text-xs pt-1 border-t border-emerald-900/60">
                    <span class="text-amber-400 font-medium">Concessão Gratuita Inicial:</span>
                    <span class="text-amber-300 font-bold"><?= e($linkData['token_requirement']) ?> Fichas Virtuais</span>
                </div>
            </div>

            <form action="/register" method="POST" class="space-y-4">
                <?= $csrfField ?>
                <input type="hidden" name="token" value="<?= e($token) ?>">

                <div>
                    <label for="full_name" class="block text-xs font-medium text-slate-300 mb-1">Nome Completo</label>
                    <input type="text" id="full_name" name="full_name" required
                           placeholder="ex: João da Silva"
                           class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition">
                </div>

                <div>
                    <label for="username" class="block text-xs font-medium text-slate-300 mb-1">Nome de Usuário (Apelido na Árvore)</label>
                    <input type="text" id="username" name="username" required autocomplete="username"
                           placeholder="ex: joaosilva"
                           class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition">
                </div>

                <div>
                    <label for="email" class="block text-xs font-medium text-slate-300 mb-1">E-mail</label>
                    <input type="email" id="email" name="email" required autocomplete="email"
                           placeholder="joao@exemplo.com"
                           class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition">
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label for="password" class="block text-xs font-medium text-slate-300 mb-1">Senha</label>
                        <input type="password" id="password" name="password" required autocomplete="new-password"
                               placeholder="Mínimo 6 dígitos"
                               class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition">
                    </div>
                    <div>
                        <label for="password_confirmation" class="block text-xs font-medium text-slate-300 mb-1">Confirmar Senha</label>
                        <input type="password" id="password_confirmation" name="password_confirmation" required autocomplete="new-password"
                               placeholder="Repita a senha"
                               class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition">
                    </div>
                </div>

                <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                    Ao cadastrar, você concorda que o Arboris é um jogo estritamente recreativo e gratuito, sem apostas, depósitos ou valor financeiro real.
                </div>

                <button type="submit"
                        class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition shadow-lg shadow-emerald-900/40">
                    Confirmar Cadastro e Entrar na Árvore
                </button>
            </form>
        <?php else: ?>
            <div class="text-center py-8">
                <p class="text-sm text-rose-400 font-medium">Link de indicação inválido ou ausente.</p>
                <p class="text-xs text-slate-400 mt-2">Para participar do jogo, solicite um link de convite a um membro participante da comunidade.</p>
                <div class="mt-6">
                    <a href="/login" class="text-xs text-emerald-400 hover:underline">Já possui cadastro? Faça login aqui</a>
                </div>
            </div>
        <?php endif; ?>
    </div>
</div>
<?php
$content = ob_get_clean();
include __DIR__ . '/../layout.php';
?>
