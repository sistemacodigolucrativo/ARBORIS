# Guia Operacional — GitHub Pages e GitHub Actions

Este documento descreve como configurar, testar e publicar o projeto **Arboris Reflorestamento** no GitHub Pages com suporte a GitHub Actions.

---

## 1. Como Rodar Localmente

### Pré-requisitos:
- Node.js (versão 18 ou superior)
- npm

### Passos:
```bash
# 1. Instalar dependências
npm install

# 2. Executar a suíte de testes do motor do jogo (39 testes automatizados)
npm run test:game

# 3. Iniciar o servidor de desenvolvimento estático
npm run dev

# 4. Para gerar a build de produção estática
npm run build

# 5. Para testar a build localmente em modo preview
npm run preview
```

---

## 2. Configuração do GitHub Pages

1. No repositório no GitHub, acesse **Settings** > **Pages**.
2. Na seção **Build and deployment**:
   - **Source:** Selecione `GitHub Actions`.
3. O repositório já inclui o arquivo `.github/workflows/deploy-pages.yml`. A cada commit na branch `main` ou `master`, o GitHub Pages será construído e publicado automaticamente.
4. **Base Path:** O arquivo `vite.config.ts` está configurado com `base: './'`, permitindo que a aplicação funcione em domínios customizados ou em subpastas de usuários do GitHub (ex: `https://usuario.github.io/repositorio/`).

---

## 3. GitHub Secrets e Gravação via GitHub Actions

### Princípio de Segurança:
- O frontend **NUNCA** recebe tokens de escrita do GitHub.
- Todas as gravações no repositório ocorrem no ambiente isolado do GitHub Actions usando segredos protegidos.

### Secrets Necessários no Repositório (Settings > Secrets and variables > Actions):
| Nome da Secret | Descrição | Obrigatório? |
| :--- | :--- | :--- |
| `GITHUB_TOKEN` | Token nativo injetado automaticamente pelo GitHub com permissão `contents: write` | Automático |
| `GAME_DISPATCH_TOKEN` | (Opcional) Personal Access Token (PAT) caso queira disparar ações a partir de webhooks externos | Opcional |

### Permissões do Workflow:
Em **Settings** > **Actions** > **General** > **Workflow permissions**:
- Marque: **"Read and write permissions"** (necessário para o commit automático dos JSONs em `.github/workflows/update-game-data.yml`).

---

## 4. Workflows Disponíveis

1. `.github/workflows/deploy-pages.yml`:
   - Responsável por instalar dependências, compilar o React com Vite e publicar a pasta `dist/` no GitHub Pages.
2. `.github/workflows/update-game-data.yml`:
   - Responsável por receber requisições de alteração de jogo, executar a validação via `scripts/process-game-action.ts`, atualizar os arquivos JSON em `/data` e `/public/data` e realizar commit atômico com concorrência travada.
