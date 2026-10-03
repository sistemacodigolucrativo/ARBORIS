<?php
$title = "Árvore-Mãe - " . e($tree['tree_code']);
ob_start();
?>
<div class="space-y-6">
    <!-- Header: Árvore-Mãe Info & Breadcrumb -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div>
            <div class="flex items-center gap-2">
                <span class="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                    <?= e($tree['category_name']) ?>
                </span>
                <span class="text-xs text-slate-400">·</span>
                <span class="text-xs font-mono text-slate-300">Código: <?= e($tree['tree_code']) ?></span>
                <span class="text-xs text-slate-400">·</span>
                <span class="text-xs text-slate-400">Ciclo #<?= e($tree['cycle_number']) ?></span>
            </div>
            <h1 class="text-lg font-bold text-slate-100 mt-1">ÁRVORE-MÃE</h1>
        </div>

        <div class="flex items-center gap-4 text-xs">
            <div class="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span class="text-slate-400">Ocupação:</span>
                <span class="font-bold text-emerald-400 ml-1"><?= e($tree['occupied_positions']) ?> / 15</span>
            </div>
            <div class="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span class="text-slate-400">Vagas Livres:</span>
                <span class="font-bold text-amber-400 ml-1"><?= e($tree['vacant_positions']) ?></span>
            </div>
        </div>
    </div>

    <!-- PARTICIPANTE DA VEZ Highlight Banner -->
    <div class="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 border-2 border-amber-500/50 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div class="absolute -right-6 -bottom-6 text-8xl text-amber-500/5 select-none pointer-events-none">👑</div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-lg shadow-amber-950">
                    👑
                </div>
                <div>
                    <div class="text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                        <span>PARTICIPANTE DA VEZ</span>
                        <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    </div>
                    <div class="text-xl font-bold text-slate-100 mt-0.5">
                        <?= $participanteDaVez ? e($participanteDaVez['full_name']) : 'Aguardando Tronco' ?>
                    </div>
                    <div class="text-xs text-slate-400">
                        @<?= $participanteDaVez ? e($participanteDaVez['username']) : '' ?> · Posição #0 (Tronco da Árvore)
                    </div>
                </div>
            </div>

            <!-- Transfer Action -->
            <div id="transferir" class="bg-slate-950/90 border border-slate-800 rounded-xl p-3 sm:w-80">
                <form action="/arvore-mae/transferir" method="POST" class="space-y-2">
                    <?= $csrfField ?>
                    <input type="hidden" name="tree_id" value="<?= e($tree['id']) ?>">
                    <input type="hidden" name="idempotency_key" value="<?= e($idempotencyKey) ?>">

                    <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-400">Transferência interna:</span>
                        <span class="font-bold text-amber-400"><?= e($tree['token_requirement']) ?> fichas</span>
                    </div>

                    <div class="text-[11px] text-slate-500">
                        [Regra parametrizável de ciclo]
                    </div>

                    <?php if ($currentUserPosition !== null && $currentUserPosition > 0): ?>
                        <button type="submit"
                                onclick="return confirm('Confirmar transferência interna de <?= e($tree['token_requirement']) ?> fichas para <?= $participanteDaVez ? e($participanteDaVez['full_name']) : '' ?>?')"
                                class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-3 rounded-lg text-xs transition shadow-md">
                            Transferir Fichas para Participante da Vez
                        </button>
                    <?php elseif ($currentUserPosition === 0): ?>
                        <div class="p-2 bg-slate-900 rounded text-center text-xs text-emerald-400 font-medium">
                            Você é o Tronco deste ciclo!
                        </div>
                    <?php else: ?>
                        <div class="p-2 bg-slate-900 rounded text-center text-xs text-slate-400">
                            Você está em modo de visualização.
                        </div>
                    <?php endif; ?>
                </form>
            </div>
        </div>
    </div>

    <!-- TREE VIEWPORT: Responsive Mobile-First Graphic Canvas -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <!-- Viewport Controls & Legend Bar -->
        <div class="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-3">
                <div class="flex items-center gap-1.5">
                    <span class="w-3 h-3 rounded-full bg-amber-400 border border-amber-300"></span>
                    <span class="text-slate-300">Tronco</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-400"></span>
                    <span class="text-slate-300">Você</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="w-3 h-3 rounded-full bg-slate-700 border border-slate-600"></span>
                    <span class="text-slate-400">Ocupado</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="w-3 h-3 rounded-full bg-slate-900 border border-dashed border-slate-600"></span>
                    <span class="text-slate-500">Vaga disponível</span>
                </div>
            </div>

            <!-- Zoom & Reset Toolbar -->
            <div class="flex items-center gap-1.5">
                <span class="text-[11px] text-slate-500 mr-1 hidden sm:inline">Navegação:</span>
                <button type="button" onclick="zoomIn()" class="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center font-bold text-sm">+</button>
                <button type="button" onclick="zoomOut()" class="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center font-bold text-sm">-</button>
                <button type="button" onclick="resetZoom()" class="px-2 h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs">Ajustar</button>
            </div>
        </div>

        <!-- Scrollable / Draggable Canvas Container -->
        <div id="canvas-container" class="tree-canvas-container relative w-full h-[520px] bg-slate-950 cursor-grab active:cursor-grabbing select-none p-2">
            <div id="tree-viewport" class="origin-top-left transition-transform duration-75 min-w-[960px] h-[520px] relative">
                <!-- SVG Vector Connectors -->
                <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 520">
                    <defs>
                        <linearGradient id="linkActiveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#10b981" stop-opacity="0.8" />
                            <stop offset="100%" stop-color="#059669" stop-opacity="0.6" />
                        </linearGradient>
                        <linearGradient id="linkVacantGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#334155" stop-opacity="0.5" />
                            <stop offset="100%" stop-color="#1e293b" stop-opacity="0.3" />
                        </linearGradient>
                    </defs>

                    <?php foreach ($links as $link): ?>
                        <line x1="<?= $link['x1'] ?>" y1="<?= $link['y1'] ?>"
                              x2="<?= $link['x2'] ?>" y2="<?= $link['y2'] ?>"
                              stroke="<?= $link['is_active'] ? 'url(#linkActiveGrad)' : 'url(#linkVacantGrad)' ?>"
                              stroke-width="<?= $link['is_active'] ? '2.5' : '1.5' ?>"
                              stroke-dasharray="<?= $link['is_active'] ? 'none' : '4,4' ?>" />
                    <?php endforeach; ?>
                </svg>

                <!-- HTML Node Badges positioned absolutely -->
                <?php foreach ($nodes as $node): ?>
                    <?php
                    $isVacant = ($node['status'] === 'vacant');
                    $isTronco = $node['is_tronco'];
                    $isMe = $node['is_current_user'];

                    // Distinct node styling
                    if ($isTronco) {
                        $boxStyle = "border-2 border-amber-400 bg-amber-950/80 text-amber-200 shadow-lg shadow-amber-900/50";
                        $badgeStyle = "bg-amber-500 text-slate-950 font-bold";
                    } elseif ($isMe) {
                        $boxStyle = "border-2 border-emerald-400 bg-emerald-950/80 text-emerald-100 shadow-lg shadow-emerald-900/50 ring-2 ring-emerald-500/40";
                        $badgeStyle = "bg-emerald-500 text-white font-bold";
                    } elseif (!$isVacant) {
                        $boxStyle = "border border-slate-700 bg-slate-900 text-slate-200";
                        $badgeStyle = "bg-slate-800 text-slate-300";
                    } else {
                        $boxStyle = "border border-dashed border-slate-800 bg-slate-950/60 text-slate-500 hover:border-slate-700";
                        $badgeStyle = "bg-slate-900 text-slate-500 border border-slate-800";
                    }

                    // Sizing
                    $width = $isTronco ? 160 : ($node['level'] === 3 ? 96 : 130);
                    $leftOffset = $node['x'] - ($width / 2);
                    $topOffset = $node['y'] - 32;
                    ?>
                    <div style="left: <?= $leftOffset ?>px; top: <?= $topOffset ?>px; width: <?= $width ?>px;"
                         class="absolute flex flex-col items-center justify-center p-2 rounded-xl <?= $boxStyle ?> transition-all hover:scale-105 z-10">
                        <div class="flex items-center gap-1 mb-0.5">
                            <span class="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono <?= $badgeStyle ?>">
                                <?= $isTronco ? 'TRONCO' : '#' . e($node['position_index']) ?>
                            </span>
                            <?php if ($isMe): ?>
                                <span class="text-[9px] bg-emerald-600 text-white px-1 rounded font-bold">VOCÊ</span>
                            <?php endif; ?>
                        </div>

                        <div class="text-[11px] font-semibold text-center truncate max-w-full leading-tight">
                            <?= e($node['label']) ?>
                        </div>

                        <?php if (!$isVacant && !empty($node['username'])): ?>
                            <div class="text-[9px] text-slate-400 truncate max-w-full">
                                @<?= e($node['username']) ?>
                            </div>
                        <?php else: ?>
                            <div class="text-[9px] text-emerald-500/80 font-mono">
                                Aberta
                            </div>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>

        <!-- Mobile Hint -->
        <div class="p-2.5 bg-slate-950/80 border-t border-slate-800/80 text-center text-[11px] text-slate-400">
            <span>Dica: Em smartphones, arraste horizontalmente para explorar os ramos da árvore.</span>
        </div>
    </div>
</div>

<!-- Vanilla JS Lightweight Viewport Pan & Zoom -->
<script>
let currentScale = 1.0;
const container = document.getElementById('canvas-container');
const viewport = document.getElementById('tree-viewport');

function updateZoom() {
    viewport.style.transform = `scale(${currentScale})`;
}

function zoomIn() {
    if (currentScale < 1.6) {
        currentScale += 0.15;
        updateZoom();
    }
}

function zoomOut() {
    if (currentScale > 0.6) {
        currentScale -= 0.15;
        updateZoom();
    }
}

function resetZoom() {
    const containerWidth = container.clientWidth;
    if (containerWidth < 960) {
        // Fit proportionally
        currentScale = Math.max(0.6, containerWidth / 1000);
    } else {
        currentScale = 1.0;
    }
    updateZoom();
    // Center scroll on Tronco
    container.scrollLeft = (1000 * currentScale - containerWidth) / 2;
}

// Mouse Drag-to-Pan
let isDown = false;
let startX, startY, scrollLeft, scrollTop;

container.addEventListener('mousedown', (e) => {
    isDown = true;
    startX = e.pageX - container.offsetLeft;
    startY = e.pageY - container.offsetTop;
    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
});
container.addEventListener('mouseleave', () => { isDown = false; });
container.addEventListener('mouseup', () => { isDown = false; });
container.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const y = e.pageY - container.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    container.scrollLeft = scrollLeft - walkX;
    container.scrollTop = scrollTop - walkY;
});

// Auto adjust on load
window.addEventListener('load', resetZoom);
window.addEventListener('resize', resetZoom);
</script>
<?php
$content = ob_get_clean();
include __DIR__ . '/../layout.php';
?>
