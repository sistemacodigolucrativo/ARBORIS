# Guia Operacional — GitHub Pages e GitHub Actions

Este documento registra o estado real do projeto **Arboris Reflorestamento** para publicacao no GitHub Pages e deixa claro o que ja esta pronto, o que depende de configuracao manual da conta e quais limites existem no modelo estatico com JSON.

---

## 1. Estado atual verificado

- Repositorio: `sistemacodigolucrativo/ARBORIS`.
- Branch principal: `main`.
- Stack atual: React, TypeScript, Vite e Tailwind.
- Build de producao: `npm run build`.
- Pasta publicada: `dist/`.
- Workflow de deploy: `.github/workflows/deploy-pages.yml`.
- Base path real em `vite.config.ts`: `base: '/ARBORIS/'`.
- URL esperada no GitHub Pages: `https://sistemacodigolucrativo.github.io/ARBORIS/`.

Observacao: o repositorio ainda precisa ter GitHub Pages ativado em **Settings > Pages**. Enquanto isso nao for feito, o site nao fica online mesmo que o workflow exista.

---

## 2. Como rodar localmente

### Pre-requisitos

- Node.js 18 ou superior. O workflow usa Node.js 22.
- npm.

### Comandos

```bash
npm install
npm run test:game
npm run build
npm run dev
npm run preview
```

`npm run test:game` executa a suite do motor do jogo antes da publicacao.

---

## 3. Configuracao manual obrigatoria no GitHub

Estas etapas exigem acesso visual/administrativo da conta GitHub e normalmente precisam ser feitas pelo dono da conta:

1. Abrir o repositorio `sistemacodigolucrativo/ARBORIS`.
2. Entrar em **Settings > Pages**.
3. Em **Build and deployment**, configurar:
   - **Source:** `GitHub Actions`.
4. Salvar.
5. Entrar em **Actions**.
6. Rodar manualmente o workflow **Deploy to GitHub Pages** ou fazer um novo commit na branch `main`.
7. Confirmar se o deploy terminou com sucesso.

Importante: o repositorio e privado. GitHub Pages em repositorio privado depende do plano da conta. Se o plano nao permitir Pages privado, sera necessario tornar o repositorio publico ou usar outro provedor de hospedagem.

---

## 4. Workflow de deploy existente

Arquivo: `.github/workflows/deploy-pages.yml`.

Fluxo atual:

1. Faz checkout do repositorio.
2. Configura Node.js 22.
3. Instala dependencias com `npm install`.
4. Executa `npm run test:game`.
5. Executa `npm run build`.
6. Configura GitHub Pages.
7. Envia `dist/` como artifact.
8. Publica com `actions/deploy-pages@v4`.

Esse fluxo e adequado para publicar app Vite no GitHub Pages usando GitHub Actions.

---

## 5. Modelo de dados JSON

O projeto possui dados versionados em JSON:

- `data/config.json`
- `data/users.json`
- `data/wallets.json`
- `data/trees.json`
- `data/referrals.json`
- `data/ledger.json`
- `data/audit-log.json`

Tambem existe copia em `public/data/`, usada pelo frontend publicado no Pages.

No GitHub Pages, o frontend consegue **ler** esses JSONs como arquivos estaticos. Isso e suficiente para demonstracao, visualizacao e prototipo publico.

---

## 6. Limite importante: persistencia real

O frontend atual registra mudancas no navegador usando `localStorage`. Isso significa:

- cadastro feito por um visitante fica local naquele navegador;
- fortalecimento de tronco feito no site nao atualiza automaticamente o repositorio;
- criacao de arvore e alteracoes admin nao viram dados oficiais compartilhados;
- ao limpar navegador ou usar outro aparelho, o estado local pode desaparecer.

Existe o workflow `.github/workflows/update-game-data.yml`, que consegue atualizar JSONs via GitHub Actions, mas o frontend ainda nao possui uma ponte segura de producao para disparar esse workflow sem expor token.

Conclusao operacional: hoje o projeto pode ir para GitHub Pages como app estatico/demo. Para uso real multiusuario, ainda precisa de uma camada segura de escrita.

---

## 7. Proximo passo tecnico recomendado

Para transformar o projeto em operacao real com dados compartilhados:

1. Manter GitHub Pages apenas como frontend.
2. Criar um backend minimo seguro ou serverless function.
3. Esse backend recebe a acao do usuario, valida autenticacao e regra de negocio.
4. O backend dispara `workflow_dispatch` ou grava os JSONs com token protegido.
5. O workflow valida novamente as regras no `scripts/process-game-action.ts`.
6. Apos commit dos JSONs, o Pages republica os dados atualizados.

Nao colocar token GitHub no frontend.

---

## 8. Checklist rapido de publicacao

- [ ] Confirmar se a conta permite Pages em repositorio privado.
- [ ] Ativar **Settings > Pages > Source: GitHub Actions**.
- [ ] Rodar workflow **Deploy to GitHub Pages**.
- [ ] Verificar se `npm run test:game` passou.
- [ ] Verificar se `npm run build` passou.
- [ ] Abrir `https://sistemacodigolucrativo.github.io/ARBORIS/`.
- [ ] Testar se `/ARBORIS/data/config.json` carrega.
- [ ] Testar entrada por `?ref=`.
- [ ] Decidir se o site sera apenas demonstracao ou se tera persistencia real multiusuario.
