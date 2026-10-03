<?php
$title = "Painel Administrativo";
ob_start();
?>
<div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div>
            <h1 class="text-lg font-bold text-slate-100">Painel de Controle e Auditoria</h1>
            <p class="text-xs text-slate-400 mt-0.5">Gestão de participantes, árvores, ledger e regras parametrizáveis</p>
        </div>
        <div class="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-lg">
            SISTEMA OPERACIONAL: ATIVO (512MB RAM)
        </div>
    </div>

    <!-- Metric Counters (Lightweight single-pass queries) -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div class="text-[11px] text-slate-400">Total de Usuários</div>
            <div class="text-xl font-bold text-slate-100 mt-1"><?= e($totalUsers) ?></div>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div class="text-[11px] text-slate-400">Árvores em Operação</div>
            <div class="text-xl font-bold text-emerald-400 mt-1"><?= e($totalTrees) ?></div>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div class="text-[11px] text-slate-400">Transferências Auditadas</div>
            <div class="text-xl font-bold text-amber-400 mt-1"><?= e($totalTransfers) ?></div>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div class="text-[11px] text-slate-400">Volume Ledger (Fichas)</div>
            <div class="text-xl font-bold text-indigo-400 mt-1"><?= e($totalLedgerVolume) ?></div>
        </div>
    </div>

    <!-- Users Management Section with Search & Pagination -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 class="text-sm font-bold text-slate-200">Participantes do Sistema</h2>

            <!-- Search input -->
            <form action="/admin" method="GET" class="flex gap-2">
                <input type="text" name="search" value="<?= e($search) ?>" placeholder="Buscar usuário ou email..."
                       class="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 w-48 sm:w-64 focus:outline-none focus:border-emerald-500">
                <button type="submit" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded text-xs">
                    Buscar
                </button>
            </form>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                        <th class="py-2 px-3">ID</th>
                        <th class="py-2 px-3">Usuário</th>
                        <th class="py-2 px-3">E-mail</th>
                        <th class="py-2 px-3">Função</th>
                        <th class="py-2 px-3 text-right">Saldo</th>
                        <th class="py-2 px-3 text-center">Status</th>
                        <th class="py-2 px-3 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 text-slate-300">
                    <?php foreach ($users as $u): ?>
                        <tr>
                            <td class="py-2.5 px-3 font-mono text-slate-500">#<?= e($u['id']) ?></td>
                            <td class="py-2.5 px-3 font-semibold text-slate-100">
                                <?= e($u['full_name']) ?> <span class="text-slate-400 font-normal">(@<?= e($u['username']) ?>)</span>
                            </td>
                            <td class="py-2.5 px-3 text-slate-400"><?= e($u['email']) ?></td>
                            <td class="py-2.5 px-3">
                                <span class="px-1.5 py-0.5 rounded text-[10px] font-mono <?= $u['role'] === 'admin' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300' ?>">
                                    <?= e($u['role']) ?>
                                </span>
                            </td>
                            <td class="py-2.5 px-3 text-right font-mono font-bold text-amber-400"><?= e($u['balance'] ?? 0) ?></td>
                            <td class="py-2.5 px-3 text-center">
                                <span class="px-2 py-0.5 rounded-full text-[10px] <?= $u['status'] === 'active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800' ?>">
                                    <?= e($u['status']) ?>
                                </span>
                            </td>
                            <td class="py-2.5 px-3 text-right">
                                <?php if ($u['id'] !== 1): ?>
                                    <form action="/admin/user/<?= e($u['id']) ?>/toggle-status" method="POST" class="inline">
                                        <?= $csrfField ?>
                                        <button type="submit" class="text-[11px] <?= $u['status'] === 'active' ? 'text-rose-400 hover:underline' : 'text-emerald-400 hover:underline' ?>">
                                            <?= $u['status'] === 'active' ? 'Bloquear' : 'Desbloquear' ?>
                                        </button>
                                    </form>
                                <?php else: ?>
                                    <span class="text-slate-600 text-[10px]">Protegido</span>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <?php if ($userTotalPages > 1): ?>
            <div class="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                <span>Página <?= e($userPage) ?> de <?= e($userTotalPages) ?></span>
                <div class="flex gap-2">
                    <?php if ($userPage > 1): ?>
                        <a href="/admin?page=<?= $userPage - 1 ?>&search=<?= urlencode($search) ?>" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200">Anterior</a>
                    <?php endif; ?>
                    <?php if ($userPage < $userTotalPages): ?>
                        <a href="/admin?page=<?= $userPage + 1 ?>&search=<?= urlencode($search) ?>" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200">Próxima</a>
                    <?php endif; ?>
                </div>
            </div>
        <?php endif; ?>
    </div>

    <!-- Active Trees Overview -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 class="text-sm font-bold text-slate-200">Árvores em Execução</h2>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                        <th class="py-2 px-3">Código</th>
                        <th class="py-2 px-3">Categoria</th>
                        <th class="py-2 px-3">Tronco da Árvore</th>
                        <th class="py-2 px-3 text-center">Ocupação</th>
                        <th class="py-2 px-3 text-center">Status</th>
                        <th class="py-2 px-3 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 text-slate-300">
                    <?php foreach ($trees as $tree): ?>
                        <tr>
                            <td class="py-2.5 px-3 font-mono font-semibold text-emerald-400"><?= e($tree['tree_code']) ?></td>
                            <td class="py-2.5 px-3"><?= e($tree['category_name']) ?></td>
                            <td class="py-2.5 px-3 text-slate-200">
                                👑 <?= e($tree['tronco_name'] ?: $tree['tronco_username']) ?>
                            </td>
                            <td class="py-2.5 px-3 text-center font-bold">
                                <?= e($tree['occupied_count']) ?> / 15
                            </td>
                            <td class="py-2.5 px-3 text-center">
                                <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300">
                                    <?= e($tree['status']) ?>
                                </span>
                            </td>
                            <td class="py-2.5 px-3 text-right">
                                <a href="/arvore-mae?id=<?= e($tree['id']) ?>" class="text-emerald-400 hover:underline">
                                    Abrir Gráfica →
                                </a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Parametrizable Game Settings (Explicit PENDING DEFINITION tags) -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div>
            <h2 class="text-sm font-bold text-slate-200">Parâmetros do Jogo & Regras Configuráveis</h2>
            <p class="text-xs text-slate-400 mt-0.5">Parâmetros dinâmicos documentados com tags explícitas de status</p>
        </div>

        <div class="space-y-3">
            <?php foreach ($settings as $setting): ?>
                <form action="/admin/setting/update" method="POST" class="p-3 bg-slate-950 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <?= $csrfField ?>
                    <input type="hidden" name="setting_key" value="<?= e($setting['setting_key']) ?>">

                    <div class="flex-1">
                        <div class="text-xs font-mono font-bold text-slate-200"><?= e($setting['setting_key']) ?></div>
                        <div class="text-[11px] text-slate-400"><?= e($setting['description']) ?></div>
                    </div>

                    <div class="flex items-center gap-2">
                        <input type="text" name="setting_value" value="<?= e($setting['setting_value']) ?>"
                               class="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-amber-300 font-mono w-40">
                        <button type="submit" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded text-xs transition">
                            Salvar
                        </button>
                    </div>
                </form>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Recent Audit Logs (Paginated & Filtered) -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 class="text-sm font-bold text-slate-200">Trilha de Auditoria do Sistema</h2>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                        <th class="py-2 px-3">Data</th>
                        <th class="py-2 px-3">Ação</th>
                        <th class="py-2 px-3">Entidade</th>
                        <th class="py-2 px-3">Usuário</th>
                        <th class="py-2 px-3">IP</th>
                        <th class="py-2 px-3">Detalhes</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                    <?php foreach ($auditLogs as $log): ?>
                        <tr>
                            <td class="py-2 px-3 text-slate-400 whitespace-nowrap"><?= e($log['created_at']) ?></td>
                            <td class="py-2 px-3 font-semibold text-emerald-400"><?= e($log['action']) ?></td>
                            <td class="py-2 px-3 text-slate-400"><?= e($log['entity_type']) ?> #<?= e($log['entity_id'] ?? '-') ?></td>
                            <td class="py-2 px-3 text-slate-300"><?= e($log['username'] ? '@' . $log['username'] : 'Sistema') ?></td>
                            <td class="py-2 px-3 text-slate-500"><?= e($log['ip_address']) ?></td>
                            <td class="py-2 px-3 text-slate-400 max-w-xs truncate"><?= e($log['details']) ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php
$content = ob_get_clean();
include __DIR__ . '/../layout.php';
?>
