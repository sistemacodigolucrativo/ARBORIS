# Executor automático de ações Arboris

O GitHub Pages é estático. Ele não deve guardar token GitHub no JavaScript do navegador.

A criação automática de árvore pelo botão `Nova Árvore` usa este fluxo seguro:

1. O painel chama `VITE_ARBORIS_ACTION_DISPATCHER_URL`.
2. Um proxy seguro, como Cloudflare Worker, valida a chave administrativa.
3. O proxy chama a API GitHub `workflow_dispatch`.
4. O workflow `process-game-dispatch.yml` executa `scripts/process-game-action.ts`.
5. Os arquivos `data/*.json` e `public/data/*.json` são gravados no repositório.
6. O deploy do GitHub Pages publica os novos JSONs.

## Variáveis necessárias no build do site

```env
VITE_ARBORIS_ACTION_DISPATCHER_URL=https://SEU_WORKER.workers.dev
```

## Secrets/variáveis necessárias no Worker

```txt
GITHUB_TOKEN=token fino com Actions: write no repositório ARBORIS
ARBORIS_ADMIN_EXECUTION_KEY=chave secreta digitada pelo coordenador no painel
ALLOWED_ORIGIN=https://sistemacodigolucrativo.github.io
GITHUB_REPOSITORY=sistemacodigolucrativo/ARBORIS
GITHUB_WORKFLOW=process-game-dispatch.yml
GITHUB_REF=main
GITHUB_ACTOR_LOGIN=sistemacodigolucrativo
```

Nunca coloque `GITHUB_TOKEN` dentro do frontend React/Vite.
