# 🧠 MEMÓRIA PERSISTENTE DO PROJETO — ARBORIS REFLORESTAMENTO

> **Documento Vivo de Engenharia e Conhecimento Arquitetural**  
> **Última Atualização:** 04 de Outubro de 2026  
> **Status do Projeto:** Frontend 100% Estático · Motor Determinístico Ativo · 39 Testes Aprovados · Zero Resíduos Legados

---

## 1. Identidade e Propósito do Sistema

* **Nome Oficial:** Arboris — Jogo Comunitário de Reflorestamento Estático
* **Conceito:** Ecossistema lúdico e cooperativo baseado em árvores fractais vivas e sementes virtuais que funcionam como pontuação interna.
* **Topologia Estrutural (1–2–4–8):** Cada árvore é composta por exatamente 15 posições concêntricas:
  * **Nível 0 (Tronco):** 1 posição central (coração da árvore de reflorestamento).
  * **Nível 1 (Ramos):** 2 guardiões primários (Ramo Esquerdo e Ramo Direito).
  * **Nível 2 (Galhos):** 4 posições de sustentação intermediária.
  * **Nível 3 (Folhas):** 8 posições externas da borda (posições 7 a 14, porta de entrada de novos membros).
* **Cláusula Não-Financeira Inegociável:**  
  O sistema é **estritamente recreativo**. Não existe dinheiro real, PIX, contas bancárias, taxas, saques, depósitos, investimentos ou promessas de retorno. As sementes são concedidas gratuitamente (25 sementes no cadastro comunitário) e servem apenas para a dinâmica do jogo.
* **Diretriz de Nomenclatura:** É estritamente proibido o uso do termo "mandala". Toda a identidade e contexto visual são fundamentados em **reflorestamento comunitário** e **reflorestamento vivo**.

---

## 2. Histórico de Evolução & Tudo o que foi Realizado

### Fase 1: Diagnóstico e Desacoplamento do Legado
* Identificou-se que o repositório original continha restos de um protótipo em PHP/SQLite (`php/`) e um servidor Node/Express (`server.ts`) com chamadas para `/api/*`.
* Todas as chamadas `fetch('/api/*')` no cliente foram completamente eliminadas de `src/App.tsx`.
* A pasta `php/` inteira e o arquivo `server.ts` foram fisicamente deletados do repositório, garantindo um código limpo e moderno em React 19 + TypeScript + Vite.

### Fase 2: Construção do Motor Matemático Puro (`src/services/gameEngine.ts`)
* Desenvolvido como um motor funcional puro e determinístico sem efeitos colaterais:
  * **Validação de Indicação:** Verificação estrita de tokens de convite e status do indicador.
  * **Cadastro e Concessão:** Novos participantes recebem 25 sementes virtuais com registro auditável no ledger.
  * **Fortalecimento do Tronco:** Débito de sementes da carteira do entrante, crédito no Tronco e ocupação ordenada da próxima vaga externa disponível (7 a 14). O valor exigido é resolvido estritamente pelas configurações da categoria, nunca aceitando valores arbitrários do cliente.
  * **Livro-Razão (Ledger) com Idempotência:** Chaves únicas (`idempotencyKey`) impedem duplicação de transações ou cobranças indevidas.
  * **Bifurcação Automática (Split 1-2-4-8):** Quando a 15ª posição é preenchida, a árvore mãe encerra seu ciclo (`completed`), o Tronco desocupa o tabuleiro e a árvore se divide harmonicamente em duas novas filhas ativas (`-L` e `-R`), promovendo os membros anteriores e abrindo 8 novas vagas em cada filha.

### Fase 3: Camada de Armazenamento e Estado Reativo (`src/services/dataStore.ts`)
* Suporta carregamento dos dados canônicos a partir dos arquivos JSON locais/remotos (`/data/*.json` e `/public/data/*.json`).
* Resolução resiliente de caminhos baseada em `import.meta.env.BASE_URL`, permitindo que a aplicação rode tanto em domínios próprios quanto em subpastas de repositórios do GitHub Pages.
* Persistência reativa no `localStorage` do navegador para simulação local, mantendo a capacidade de "Reset JSON" para sincronizar com os dados oficiais do repositório.

### Fase 4: Automação GitHub Actions e Proteção contra Concorrência
* Criado o script `scripts/process-game-action.ts` para processar ações enviadas via CI/CD.
* Criado o workflow `.github/workflows/update-game-data.yml` com concorrência serializada (`concurrency: group: game-json-write, cancel-in-progress: false`), garantindo gravações atômicas e imutabilidade dos dados nos JSONs.
* Criado o workflow `.github/workflows/deploy-pages.yml` configurado para publicação no GitHub Pages.

### Fase 5: Validação Automatizada (39 Testes Aprovados)
* Criada a suíte `scripts/test-game-engine.ts` cobrindo:
  * Validação estrutural de todos os JSONs.
  * Cadastro de participantes e checagem de integridade de indicação.
  * Concessão inicial e transferências de sementes.
  * Ocupação de posições externas (7..14).
  * Proteção rigorosa contra duplicidade (idempotency key).
  * Preenchimento de 15/15 e geração das 2 filhas bifurcadas com 8 vagas cada.
  * **Resultado:** 39 testes executados, 39 aprovados, 0 falhas.

### Fase 6: Criação da Página Pública de Entrada (`src/components/PublicLandingPage.tsx`)
* Criada uma página de entrada moderna, acolhedora e explicativa:
  * Hero Section com o tema **"A Harmonia do Reflorestamento Vivo em Tabuleiro"**.
  * Aviso claro e destacado de não-financeiro.
  * Guia passo a passo em 4 etapas (Convite, Fortalecimento, Florescimento e Bifurcação).
  * Anatomia das 15 posições com detalhamento dos 4 níveis.
  * Pilares de transparência e FAQ interativo expansível.
  * Botões de acesso rápido: "Entrar no Jogo", "Ver Tabuleiro" e navegação de retorno.

### Fase 7: Eliminação Integral do Termo "Mandala"
* Varredura global em todos os arquivos de código, componentes, markdown e artefatos de build.
* Termo substituído por conceitos de "reflorestamento comunitário", alinhando 100% da narrativa com a visão do projeto.

### Fase 8: Saneamento e Proteção de Privacidade (Remoção de Dados Sensíveis)
* Remoção definitiva do campo `phone` (telefone/WhatsApp) de todos os arquivos JSON (`data/users.json` e `public/data/users.json`).
* Exclusão do campo dos tipos (`src/types/game.ts`), formulários de cadastro (`src/App.tsx`), motor de regras (`src/services/gameEngine.ts`), camada de persistência (`src/services/dataStore.ts`) e processador do GitHub Actions (`scripts/process-game-action.ts`).
* O cadastro agora exige apenas Nome e Sobrenome para gerar o `@username` de jogo lúdico, garantindo 100% de conformidade de privacidade em repositório público no GitHub.


---

## 3. Mapa Arquitetural do Código

```
/
├── data/                         # Base de dados canônica em JSON (GitHub como DB)
│   ├── config.json               # Configurações do ecossistema e categorias
│   ├── users.json                # Participantes cadastrados
│   ├── wallets.json              # Carteiras e saldos de sementes
│   ├── trees.json                # Tabuleiros ativos e posições das árvores
│   ├── referrals.json            # Links e tokens de indicação
│   ├── ledger.json               # Livro-razão contábil com idempotência
│   └── audit-log.json            # Trilha cronológica de auditoria
├── docs/                         # Documentação técnica e operacional
│   ├── GUIA_GITHUB_PAGES_E_ACTIONS.md
│   └── RELATORIO_TECNICO_E_MIGRACAO.md
├── public/                       # Arquivos estáticos servidos pelo Vite
│   └── data/                     # Cópia dos JSONs para acesso direto no Pages
├── scripts/                      # Scripts de validação e CI/CD
│   ├── process-game-action.ts    # Processador executado pela GitHub Action
│   └── test-game-engine.ts       # Suíte com os 39 testes automatizados
├── src/                          # Código-fonte React / Vite / TypeScript
│   ├── components/
│   │   └── PublicLandingPage.tsx # Página pública principal explicativa
│   ├── services/
│   │   ├── dataStore.ts          # Gerenciador de estado e persistência
│   │   └── gameEngine.ts         # Motor matemático puro das regras de negócio
│   ├── types/
│   │   └── game.ts               # Tipos TypeScript do ecossistema
│   ├── App.tsx                   # Aplicação principal e alternador de visões
│   ├── index.css                 # Estilos globais Tailwind CSS
│   └── main.tsx                  # Ponto de entrada do React
├── .github/workflows/            # Workflows de automação
│   ├── deploy-pages.yml          # Publicação estática no GitHub Pages
│   └── update-game-data.yml      # Processador de jogadas e gravação dos JSONs
├── index.html                    # HTML base com meta tags otimizadas
├── package.json                  # Dependências e scripts estáticos
├── PROJECT_MEMORY.md             # ESTE ARQUIVO DE MEMÓRIA PERSISTENTE
├── README.md                     # Visão geral do repositório
└── vite.config.ts                # Configuração do Vite (base: './')
```

---

## 4. Regras de Segurança e Diretrizes para o Futuro

1. **NUNCA colocar tokens do GitHub no Frontend:** Nenhuma chave secreta ou Personal Access Token pode residir no código JavaScript do cliente.
2. **Imutabilidade do Livro-Razão:** Toda concessão, débito ou crédito de sementes deve ter obrigatoriamente um registro no `ledger.json` e uma `idempotencyKey`.
3. **Caminhos Relativos no Vite:** Manter sempre `base: './'` no `vite.config.ts` para que a aplicação seja portável para qualquer subpasta de repositório no GitHub Pages.
4. **Respeito à Temática:** Manter o foco em reflorestamento comunitário, cooperação e dinâmica fractal, preservando o caráter não-financeiro.

---

## 5. Comandos de Manutenção

* **Rodar os 39 Testes do Motor:**
  ```bash
  npm run test:game
  ```
* **Ambiente de Desenvolvimento:**
  ```bash
  npm run dev
  ```
* **Compilação Estática para Produção:**
  ```bash
  npm run build
  ```
* **Testar o Build Estático Localmente:**
  ```bash
  npm run preview
  ```
