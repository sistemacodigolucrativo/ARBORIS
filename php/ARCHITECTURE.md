# Arquitetura do Sistema Arboris - Orçamento 512 MB RAM

## 1. Princípio Fundamental de Engenharia
512 MB de RAM não é uma limitação tratada como "pós-otimização", mas sim o **requisito central de dimensionamento** de toda a aplicação. A arquitetura foi concebida para que o sistema completo nunca exceda ~350 MB sob carga simultânea.

---

## 2. Orçamento Físico de Memória (RAM Breakdown)

| Componente | Memória Alocada / Teto | Justificativa Técnica |
| :--- | :--- | :--- |
| **Linux Kernel & SO (Debian 12)** | ~120 MB - 140 MB | Sistema base minimalista com systemd padrão e serviços supérfluos desativados. |
| **Nginx Web Server** | ~15 MB | 1 processo worker (suficiente para 1 vCPU), epoll, buffers estáticos pequenos (16 KB), sendfile ativo. |
| **SQLite 3 (WAL Mode)** | ~15 MB - 25 MB | PRAGMA mmap_size = 32M; PRAGMA cache_size = -2000 (~8MB página de cache). Sem daemon de banco separado! |
| **PHP 8.2-FPM (Pool de Execução)** | ~120 MB - 160 MB | `pm = dynamic`, max_children = 6, memory_limit = 32M por worker. OPcache em memória compartilhada de 32MB. |
| **Margem de Segurança (Buffer)** | ~160 MB | Margem para picos de E/S de rede e buffers de disco do SO. |
| **TOTAL MÁXIMO** | **~430 MB / 512 MB** | **Opera com folga e sem risco de acionar o OOM Killer do Linux.** |

---

## 3. Decisões Arquiteturais "Zero-Slop"
1. **Nenhum Processo Node.js em Produção**: O Tailwind CSS é compilado previamente ou servido de forma estática; não há servidores Node.js permanentes consumindo 150-200 MB de RAM.
2. **Nenhum Daemon Redis**: O rate limiting e sessões utilizam armazenamento em disco leve e o próprio SQLite, economizando 40-60 MB de RAM do Redis.
3. **Nenhum Docker**: Aplicação roda nativamente sobre Nginx + PHP-FPM, eliminando o overhead de memória de containerd, runc e pontes de rede virtuais.
4. **Sem Consultas N+1**: Toda a árvore de 15 posições e histórico são carregados em consultas unificadas e indexadas.
5. **Transações com `BEGIN IMMEDIATE`**: No SQLite, evita-se deadlock em reservas concorrentes de vagas e movimentações do Ledger obtendo lock de escrita imediatamente no início da transação.

---

## 4. Topologia da Árvore Binária (15 Posições)

```
                    N0: [00 - TRONCO]
                       /        \
             N1:   [01]          [02]
                  /    \        /    \
         N2:   [03]    [04]  [05]    [06]
               /  \    /  \  /  \    /  \
     N3:     [07][08][09][10][11][12][13][14]
```

- **Nível 0**: 1 posição (0 - Tronco da Árvore / Participante da Vez padrão)
- **Nível 1**: 2 posições (1: ramo esquerdo, 2: ramo direito)
- **Nível 2**: 4 posições (3, 4, 5, 6)
- **Nível 3**: 8 posições (7, 8, 9, 10, 11, 12, 13, 14)
- **Total Estrutural**: 15 posições fixas criadas no momento da geração da árvore, com status `vacant` ou `occupied`.
