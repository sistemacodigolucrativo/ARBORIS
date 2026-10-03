<!DOCTYPE html>
<html lang="pt-BR" class="h-full bg-slate-950 text-slate-100">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title><?= isset($title) ? e($title) . ' - Arboris' : 'Arboris - Sistema de Árvores & Fichas Virtuais' ?></title>
    <!-- Tailwind CSS (Zero-runtime, precompiled or CDN standalone for instant low-RAM loading) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        forest: {
                            800: '#143825',
                            900: '#0d281a',
                            950: '#07180f'
                        },
                        amber: {
                            500: '#f59e0b',
                            600: '#d97706'
                        }
                    }
                }
            }
        }
    </script>
    <style>
        /* Lightweight pan/zoom viewport styles */
        .tree-canvas-container {
            touch-action: pan-x pan-y pinch-zoom;
            overflow: auto;
            -webkit-overflow-scrolling: touch;
        }
        .node-pulse {
            animation: pulse-ring 2.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        @keyframes pulse-ring {
            0% { transform: scale(0.96); opacity: 0.8; }
            50% { transform: scale(1.04); opacity: 1; }
            100% { transform: scale(0.96); opacity: 0.8; }
        }
    </style>
</head>
<body class="h-full flex flex-col antialiased selection:bg-emerald-500 selection:text-white bg-slate-950">
    <div class="w-full max-w-md mx-auto flex-1 flex flex-col bg-slate-950 border-x border-slate-900 shadow-2xl relative pb-20">
        <!-- Header / Navigation -->
        <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 py-3">
            <div class="flex items-center justify-between">
                <a href="/" class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-sm shadow-sm">
                        🌲
                    </div>
                    <div class="flex flex-col">
                        <div class="flex items-center gap-1.5">
                            <span class="font-bold text-slate-100 text-sm tracking-wide leading-none">ARBORIS</span>
                            <span class="text-[9px] text-emerald-400 font-mono bg-emerald-950/80 border border-emerald-800/80 px-1 py-0.5 rounded">
                                512MB
                            </span>
                        </div>
                        <span class="text-[10px] text-slate-400">15 Posições & Fichas Virtuais</span>
                    </div>
                </a>

                <?php if ($currentUser): ?>
                    <a href="/logout" class="text-xs text-slate-400 hover:text-rose-400 transition bg-slate-800 px-2.5 py-1 rounded-lg">Sair</a>
                <?php else: ?>
                    <a href="/login" class="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition bg-slate-800 px-2.5 py-1 rounded-lg">Entrar</a>
                <?php endif; ?>
            </div>
        </header>

        <!-- Flash Notifications -->
        <div class="px-4 w-full mt-3">
            <?php if ($flashSuccess): ?>
                <div class="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2">
                    <span>✓</span>
                    <span><?= e($flashSuccess) ?></span>
                </div>
            <?php endif; ?>
            <?php if ($flashError): ?>
                <div class="p-3 rounded-xl bg-rose-950/80 border border-rose-700/60 text-rose-200 text-xs flex items-center gap-2">
                    <span>⚠</span>
                    <span><?= e($flashError) ?></span>
                </div>
            <?php endif; ?>
        </div>

        <!-- Main View Content -->
        <main class="flex-1 w-full px-4 py-4 space-y-4">
            <?= $content ?? '' ?>
        </main>

        <!-- Fixed Bottom App Navigation (Identical format on all viewports) -->
        <nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur border-t border-slate-800 flex items-center justify-around py-2 px-1 z-40">
            <a href="/arvore-mae" class="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-emerald-400 font-bold transition">
                <span class="text-base">🌲</span>
                <span class="text-[10px]">Árvore</span>
            </a>
            <a href="/dashboard" class="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-slate-200 transition">
                <span class="text-base">🪙</span>
                <span class="text-[10px]">Painel</span>
            </a>
            <?php if ($currentUser && $currentUser['role'] === 'admin'): ?>
                <a href="/admin" class="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-amber-400 hover:text-amber-300 transition">
                    <span class="text-base">🛡️</span>
                    <span class="text-[10px]">Admin</span>
                </a>
            <?php endif; ?>
        </nav>
    </div>
</body>
</html>
