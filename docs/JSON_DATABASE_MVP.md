# ARBORIS - Banco JSON online sem VPS

## Objetivo

Rodar o ARBORIS como MVP sem VPS, sem MySQL, sem PostgreSQL e sem token exposto no frontend.

O site continua hospedado no GitHub Pages. Os dados do jogo ficam nos arquivos JSON do repositorio:

- `data/users.json`
- `data/trees.json`
- `data/wallets.json`
- `data/referrals.json`
- `data/ledger.json`
- `data/audit-log.json`
- `public/data/*.json`

## Modelo adotado

O navegador nao escreve diretamente no GitHub. Isso seria inseguro, porque exigiria expor um token no JavaScript.

O fluxo adotado:

1. O GitHub Pages carrega o site estatico.
2. O frontend le os JSONs publicados em `public/data`.
3. Uma acao do jogo gera uma issue estruturada no GitHub.
4. O workflow `Process Game Issue` le o JSON da issue.
5. A Action valida a acao usando o motor do jogo.
6. A Action atualiza `data/*.json` e `public/data/*.json`.
7. A Action faz commit das alteracoes.
8. O workflow de Pages publica o novo estado.
9. A issue e comentada e fechada.

## Por que usar issue como fila

Sem servidor proprio, o GitHub Pages nao consegue receber POST seguro nem guardar segredo.

GitHub Issues funciona como fila de solicitacoes publica e auditavel. O segredo de escrita fica somente no `GITHUB_TOKEN` do GitHub Actions, nunca no frontend.

## Workflows envolvidos

- `.github/workflows/process-game-issue.yml`
  - Dispara quando uma issue com titulo `[ARBORIS_ACTION]` e aberta.
  - Aceita apenas `register_participant` e `strengthen_tronco`.
  - Extrai o bloco JSON da issue.
  - Executa `scripts/process-game-action.ts`.
  - Atualiza os JSONs e fecha a issue.

- `.github/workflows/update-game-data.yml`
  - Mantido como fluxo manual via `workflow_dispatch`.
  - Continua util para administracao ou teste manual de payload.

- `.github/workflows/deploy-pages.yml`
  - Publica o frontend no GitHub Pages.
  - Tambem republica os JSONs estaticos apos commits de dados.

## Controle basico contra abuso

- Token do GitHub nunca fica no frontend.
- A Action aceita apenas acoes permitidas por issue publica.
- `idempotencyKey` evita processamento duplicado.
- O motor valida regras do jogo antes de gravar.
- Novos usuarios recebem `githubActor`, capturado da conta GitHub que abriu a issue.
- Fortalecimento de tronco bloqueia movimentacao de usuario vinculado a outro `githubActor`.
- `ledger.json` registra movimentacoes.
- `audit-log.json` registra auditoria.

## Limitacoes assumidas

Este modelo e aceitavel para MVP/jogo, mas nao equivale a banco transacional real.

Limitacoes:

- O usuario precisa ter conta GitHub para enviar a issue.
- A gravacao nao e instantanea; depende da fila do GitHub Actions e do deploy do Pages.
- Repositorio publico expoe dados publicos do jogo.
- Dados sensiveis nao devem ser gravados nos JSONs.
- Nao serve para dinheiro real, PIX, saque, deposito ou investimento.

## Estado atual

Implementado:

- Frontend gera solicitacao online por issue.
- Cadastro nao e mais salvo apenas no navegador.
- Fortalecimento de tronco nao e mais salvo apenas no navegador.
- Workflow de issue grava JSON com `GITHUB_TOKEN` seguro.
- Typecheck, build e testes do motor passaram localmente.

Pendente para validacao real:

- Abrir uma issue de cadastro pelo site publicado.
- Confirmar que o workflow `Process Game Issue` processa e fecha a issue.
- Confirmar que o commit dos JSONs dispara novo deploy do Pages.
- Recarregar o site e confirmar que o novo usuario aparece vindo do JSON online.
