<?php
$title = "Painel do Jogador";
ob_start();
?>
<div class="space-y-6">
    <!-- Top Welcome & Balance Card -->
    <div class="bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3.5">
                <div class="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-xl font-bold text-emerald-400">
                    <?= mb_strtoupper(mb_substr($user['full_name'] ?: $user['username'], 0, 1)) ?>
                </div>
                <div>
                    <h1 class="text-lg font-bold text-slate-100"><?= e($user['full_name']) ?></h1>
                    <div class="flex items-center gap-2 text-xs text-slate-400">
                        <span>@<?= e($user['username']) ?></span>
                        <span aria-hidden="true">·</span>
                        <span class="text-emerald-400"><?= $membership ? e($membership['category_name']) : 'Sem árvore ativa' ?></span>
                    </div>
                </div>
            </div>

            <!-- Virtual Token Balance -->
            <div class="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg">
                    🪙
                </div>
                <div>
                    <div class="text-[11px] text-slate-400 uppercase font-mono tracking-wider">Saldo de Fichas</div>
                    <div class="text-xl font-bold text-amber-400"><?= e($user['balance']) ?> <span class="text-xs text-slate-400 font-normal">virtuais</span></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Active Tree Summary & Participante da Vez -->
    <?php if ($membership): ?>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Árvore-Mãe Status Card -->
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div class="flex items-center justify-between">
                    <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sua Posição na Árvore</div>
                    <span class="text-xs text-slate-400 font-mono"><?= e($membership['tree_code']) ?></span>
                </div>

                <div class="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div>
                        <div class="text-xs text-slate-400">Posição Atual:</div>
                        <div class="text-base font-bold text-emerald-400">
                            <?= $membership['position_index'] === 0 ? 'TRONCO (Líder da Árvore)' : 'Posição #' . e($membership['position_index']) . ' (Nível ' . e($membership['level']) . ')' ?>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs text-slate-400">Ciclo:</div>
                        <div class="text-sm font-semibold text-slate-200">#<?= e($membership['cycle_number']) ?></div>
                    </div>
                </div>

                <a href="/arvore-mae?id=<?= e($membership['tree_id']) ?>"
                   class="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-lg text-xs transition">
                    <span>Visualizar Árvore-Mãe Completa</span>
                    <span>→</span>
                </a>
            </div>

            <!-- Participante da Vez Card -->
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div class="flex items-center justify-between">
                    <div class="text-xs font-semibold text-amber-400 uppercase tracking-wider">Participante da Vez</div>
                    <span class="text-xs text-slate-400 font-mono">Destinatário do Ciclo</span>
                </div>

                <?php if ($participanteDaVez): ?>
                    <div class="flex items-center gap-3.5 p-3 bg-slate-950 rounded-lg border border-amber-900/40">
                        <div class="w-11 h-11 rounded-full bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-lg">
                            👑
                        </div>
                        <div>
                            <div class="text-sm font-bold text-slate-100"><?= e($participanteDaVez['full_name']) ?></div>
                            <div class="text-xs text-slate-400">@<?= e($participanteDaVez['username']) ?> · <?= e($participanteDaVez['role']) ?></div>
                        </div>
                    </div>

                    <a href="/arvore-mae?id=<?= e($membership['tree_id']) ?>#transferir"
                       class="w-full inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-2.5 px-4 rounded-lg text-xs transition">
                        <span>Acessar Transferência Interna</span>
                        <span>→</span>
                    </a>
                <?php else: ?>
                    <p class="text-xs text-slate-400">Aguardando determinação do participante da vez.</p>
                <?php endif; ?>
            </div>
        </div>
    <?php endif; ?>

    <!-- Referral Links Section -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-slate-200">Seus Links de Indicação Gratuitos</h2>
            <span class="text-xs text-slate-500">Tokens Criptograficamente Seguros</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <?php foreach ($referralLinks as $link): ?>
                <?php $fullUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost:3000') . '/ref/' . $link['token']; ?>
                <div class="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                    <div class="flex items-center justify-between text-xs">
                        <span class="font-semibold text-slate-200"><?= e($link['category_name']) ?></span>
                        <span class="text-emerald-400"><?= e($link['token_requirement']) ?> fichas</span>
                    </div>

                    <div class="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Cliques: <?= e($link['clicks']) ?></span>
                        <span>Cadastros: <?= e($link['registrations_count']) ?></span>
                    </div>

                    <div class="pt-1 flex gap-2">
                        <input type="text" readonly value="<?= e($fullUrl) ?>" id="ref_<?= e($link['id']) ?>"
                               class="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-300">
                        <button onclick="copyLink('ref_<?= e($link['id']) ?>')"
                                class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition">
                            Copiar
                        </button>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Ledger & Movement History (Paginated) -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-slate-200">Histórico de Movimentações (Ledger Contábil)</h2>
            <span class="text-xs text-slate-500">Últimos registros auditados</span>
        </div>

        <?php if (!empty($history)): ?>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                        <tr>
                            <th class="py-2.5 px-3">Data</th>
                            <th class="py-2.5 px-3">Tipo</th>
                            <th class="py-2.5 px-3">Origem/Destino</th>
                            <th class="py-2.5 px-3 text-right">Valor</th>
                            <th class="py-2.5 px-3 text-right">Saldo Posterior</th>
                            <th class="py-2.5 px-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800/60 text-slate-300">
                        <?php foreach ($history as $item): ?>
                            <tr>
                                <td class="py-2.5 px-3 text-slate-400 whitespace-nowrap"><?= e($item['created_at']) ?></td>
                                <td class="py-2.5 px-3 font-mono text-[11px]">
                                    <?php if ($item['type'] === 'INITIAL_GRANT'): ?>
                                        <span class="text-emerald-400">CONCESSÃO INICIAL</span>
                                    <?php elseif ($item['type'] === 'TRANSFER_OUT'): ?>
                                        <span class="text-rose-400">TRANSFERÊNCIA ENVIADA</span>
                                    <?php elseif ($item['type'] === 'TRANSFER_IN'): ?>
                                        <span class="text-emerald-400">TRANSFERÊNCIA RECEBIDA</span>
                                    <?php else: ?>
                                        <span class="text-slate-300"><?= e($item['type']) ?></span>
                                    <?php endif; ?>
                                </td>
                                <td class="py-2.5 px-3 text-slate-400">
                                    <?= e($item['dest_username'] ? 'Para: @' . $item['dest_username'] : ($item['source_username'] ? 'De: @' . $item['source_username'] : 'Sistema')) ?>
                                </td>
                                <td class="py-2.5 px-3 text-right font-bold <?= $item['amount'] >= 0 ? 'text-emerald-400' : 'text-rose-400' ?>">
                                    <?= $item['amount'] > 0 ? '+' . e($item['amount']) : e($item['amount']) ?>
                                </td>
                                <td class="py-2.5 px-3 text-right font-mono text-slate-400"><?= e($item['balance_after']) ?></td>
                                <td class="py-2.5 px-3 text-center">
                                    <span class="text-[10px] text-emerald-400">✓ Confirmado</span>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <p class="text-xs text-slate-500 py-3">Nenhuma movimentação registrada até o momento.</p>
        <?php endif; ?>
    </div>
</div>

<script>
function copyLink(elementId) {
    const input = document.getElementById(elementId);
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value);
    alert('Link copiado para a área de transferência!');
}
</script>
<?php
$content = ob_get_clean();
include __DIR__ . '/../layout.php';
?>
