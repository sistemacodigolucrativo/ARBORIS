# Status de Continuidade — GitHub Pages / Arboris

Atualizado em: 2026-10-04.

Este arquivo registra o estado real do trabalho para que outra IA ou desenvolvedor consiga continuar sem depender do historico do chat.

---

## 1. Repositorio auditado

- Repositorio: `sistemacodigolucrativo/ARBORIS`
- Branch principal: `main`
- Projeto atual: app estatico React + TypeScript + Vite
- Hospedagem alvo: GitHub Pages
- URL esperada: `https://sistemacodigolucrativo.github.io/ARBORIS/`
- Base path configurado: `base: '/ARBORIS/'` em `vite.config.ts`

---

## 2. Estado confirmado antes desta rodada

Foi confirmado via GitHub que:

- O repositorio existe e e privado.
- O usuario/conexao tinha permissao de admin/push pelo conector GitHub.
- O repositorio tinha `has_pages=false`, portanto Pages ainda nao estava publicado/ativo.
- Existem workflows em `.github/workflows/`:
  - `deploy-pages.yml`
  - `update-game-data.yml`
- O deploy workflow ja tinha estrutura adequada para Pages com Actions.
- Os dados existem em `data/` e `public/data/`.
- O frontend le dados estaticos e usa `localStorage` para alteracoes locais.

---

## 3. Achados principais da auditoria

### Pronto para publicacao estatica/demo

O projeto esta tecnicamente preparado para GitHub Pages como aplicacao estatica:

- Vite configurado para subpath `/ARBORIS/`.
- Workflow `deploy-pages.yml` usa `actions/configure-pages`, `actions/upload-pages-artifact` e `actions/deploy-pages`.
- Build publica `dist/`.
- JSONs publicos ficam em `public/data/` e devem ser acessiveis em `/ARBORIS/data/*.json` apos deploy.

### Ainda nao pronto para operacao real multiusuario

O app atual nao possui escrita compartilhada real a partir do site publicado:

- Cadastro no frontend grava no `localStorage` do navegador.
- Fortalecimento de tronco grava no `localStorage`.
- Criacao de arvore/admin grava no `localStorage`.
- O workflow `update-game-data.yml` consegue atualizar JSONs, mas ainda nao existe ponte segura de producao entre frontend e workflow.
- Nao deve ser colocado token GitHub no frontend.

### Risco de administracao

- O painel admin depende do campo `role: admin` nos dados carregados.
- Existe login direto listando usuarios.
- Isso e aceitavel para prototipo/demo, mas nao para producao real.

---

## 4. Alteracoes feitas nesta rodada

### `metadata.json`

Atualizado para refletir o projeto atual:

- Nome: `Arboris Reflorestamento`.
- Descricao: app estatico React/Vite com dados JSON versionados.
- Removidas referencias antigas a PHP, SQLite, Vanilla JS e Gemini server-side.
- Registrado target de deploy: GitHub Pages.

Commit: `b0caa435508e55d3de3e718feb7eb85113357f33`

### `.env.example`

Atualizado para deixar claro que:

- O app estatico atual nao exige variaveis de ambiente para GitHub Pages.
- Dados iniciais sao lidos de `public/data/`.
- Segredos GitHub/PATs nunca devem ir para o frontend.
- Variaveis futuras publicas devem usar prefixo `VITE_`.

Commit: `ab561db46b8f65f08a4b05b4c0c98911930e50a9`

### `docs/GUIA_GITHUB_PAGES_E_ACTIONS.md`

Reescrito para:

- Corrigir divergencia sobre `base`.
- Registrar que o valor real e `base: '/ARBORIS/'`.
- Registrar URL esperada.
- Separar o que esta pronto do que depende de configuracao manual no GitHub.
- Explicar limite do modelo JSON/localStorage.
- Adicionar checklist de publicacao.

Commit: `0da7979a93d45252d638524480c0f1e181140fa3`

### `docs/STATUS_GITHUB_PAGES_DEPLOY.md`

Criado este documento de continuidade.

---

## 5. O que falta o dono da conta fazer

Estas acoes exigem acesso visual/administrativo ao GitHub e podem depender do plano da conta:

1. Abrir `sistemacodigolucrativo/ARBORIS` no GitHub.
2. Ir em **Settings > Pages**.
3. Em **Build and deployment**, selecionar:
   - **Source:** `GitHub Actions`.
4. Salvar.
5. Ir em **Actions**.
6. Rodar manualmente **Deploy to GitHub Pages** ou fazer novo commit em `main`.
7. Confirmar se o workflow terminou com sucesso.
8. Abrir `https://sistemacodigolucrativo.github.io/ARBORIS/`.

Observacao: como o repositorio e privado, GitHub Pages em repositorio privado pode depender do plano GitHub. Se nao estiver disponivel, ha duas alternativas:

- tornar o repositorio publico;
- hospedar em outro servico que suporte repo privado no plano atual.

---

## 6. Validacoes recomendadas depois que Pages for ativado

1. Abrir a URL principal:
   - `https://sistemacodigolucrativo.github.io/ARBORIS/`
2. Confirmar se os assets carregam sem 404.
3. Abrir diretamente:
   - `https://sistemacodigolucrativo.github.io/ARBORIS/data/config.json`
4. Testar fluxo publico:
   - pagina inicial;
   - ver tabuleiro;
   - entrar no jogo.
5. Testar link com referencia:
   - `https://sistemacodigolucrativo.github.io/ARBORIS/?ref=<token-real>`
6. Testar recarregamento da pagina.
7. Verificar console do navegador para erros de caminho/base path.
8. Conferir se o workflow `Deploy to GitHub Pages` passou por:
   - `npm run test:game`
   - `npm run build`
   - deploy artifact.

---

## 7. Proximo plano tecnico para persistencia real

Se o objetivo for apenas vitrine/demo, publicar no Pages e suficiente.

Se o objetivo for operacao real com varios usuarios compartilhando o mesmo estado, implementar:

1. Backend minimo ou serverless function autenticada.
2. Endpoint para receber acoes do jogo.
3. Validacao de usuario/permissao fora do navegador.
4. Disparo seguro do workflow `update-game-data.yml` ou escrita controlada dos JSONs.
5. Revalidacao das regras no `scripts/process-game-action.ts`.
6. Commit atomico dos JSONs em `data/` e `public/data/`.
7. Novo deploy automatico do Pages apos atualizacao dos dados.

Nao usar token GitHub no frontend.

---

## 8. Comandos importantes

```bash
npm install
npm run test:game
npm run build
npm run dev
npm run preview
```

Workflow principal de deploy:

```text
.github/workflows/deploy-pages.yml
```

Workflow de atualizacao de dados JSON:

```text
.github/workflows/update-game-data.yml
```

Motor de regras:

```text
src/services/gameEngine.ts
```

Camada de dados do frontend:

```text
src/services/dataStore.ts
```

---

## 9. Observacao final para continuidade

Nao reestruturar o projeto antes de publicar a versao estatica. O caminho mais seguro e:

1. Ativar Pages.
2. Validar deploy e carregamento dos JSONs.
3. Somente depois decidir se o app fica demo ou se sera criada persistencia real.

---

## 10. Atualizacao - Banco JSON online MVP

Foi implementado o modelo sem VPS e sem banco pago usando GitHub Issues como fila de escrita e GitHub Actions como processador seguro.

Arquivos principais:

- `.github/workflows/process-game-issue.yml`
- `scripts/process-game-action.ts`
- `src/services/dataStore.ts`
- `src/services/gameEngine.ts`
- `src/types/game.ts`
- `docs/JSON_DATABASE_MVP.md`

Fluxo atual:

1. O site le os JSONs publicados.
2. Cadastro e fortalecimento geram uma issue `[ARBORIS_ACTION]`.
3. A Action extrai o JSON da issue.
4. O motor valida a regra.
5. A Action atualiza `data/*.json` e `public/data/*.json`.
6. A Action commita as alteracoes.
7. O Pages republica o site/dados.

Validado localmente:

- `npm run lint`
- `npm run build`
- `npm run test:game`

Pendente de validacao no GitHub:

- Abrir uma solicitacao real pelo site publicado.
- Confirmar execucao do workflow `Process Game Issue`.
- Confirmar commit automatico dos JSONs.
- Confirmar novo deploy do Pages com os dados atualizados.
