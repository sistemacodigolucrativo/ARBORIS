# Relatório Técnico de Migração e Arquitetura — Projeto Arboris Reflorestamento

> **IMPORTANTE — NATUREZA EXCLUSIVAMENTE RECREATIVA:**  
> Este projeto é estritamente um jogo comunitário virtual inspirado na dinâmica de reflorestamento comunitário e árvores fractais (topologia 1-2-4-8).  
> **NÃO É UM SISTEMA FINANCEIRO.** Não existe dinheiro real, saque, depósito, investimento, remuneração, promessa de ganho ou transferência de valores monetários. Todas as transações ocorrem em "sementes" virtuais de pontuação interna lúdica.

---

## 1. Visão Geral da Migração

O projeto foi migrado de uma arquitetura híbrida (com protótipo PHP / SQLite e servidor Node/Express) para uma **aplicação 100% estática em React + Vite + TypeScript**, desenhada para ser hospedada diretamente no **GitHub Pages** utilizando **arquivos JSON versionados no repositório** como base de dados transparente e auditável.

---

## 2. Diagnóstico Técnico

### 2.1 Estrutura Identificada
- **Frontend Original:** Aplicação React com Tailwind CSS e Lucide Icons, mas dependente de rotas HTTP `/api/*` apontadas para backend em memória.
- **Backend Node (`server.ts`):** Servidor Express que mantinha o estado em memória RAM e realizava proxy com o Vite.
- **Protótipo PHP (`php/`):** Implementação inicial isolada usando PHP e SQLite (`arboris.db`).

### 2.2 Decisões de Migração
| Componente | Ação | Justificativa |
| :--- | :--- | :--- |
| `src/` (React/TS) | **Mantido e Adaptado** | Base oficial do frontend estático |
| `data/*.json` | **Criado** | Base de dados oficial versionada em JSON |
| `public/data/*.json` | **Criado** | Cópia estática pública para consumo via `fetch()` no GitHub Pages |
| `src/services/gameEngine.ts` | **Criado** | Motor de regras puras (sem efeitos colaterais) para frontend e CI/CD |
| `src/services/dataStore.ts` | **Criado** | Camada de dados que consome JSONs estáticos e persiste localmente com simulação de commit |
| `src/services/authStore.ts` | **Criado** | Sessão de usuário no cliente sem exposição de credenciais |
| `scripts/process-game-action.ts`| **Criado** | Validador e executor de transações para o GitHub Actions |
| `scripts/test-game-engine.ts` | **Criado** | Suíte automatizada com 39 testes de integridade do jogo |
| `.github/workflows/` | **Criado** | Workflows para atualização atômica de JSONs e deploy no Pages |
| `server.ts` | **Isolado** | Não é mais necessário para a execução no GitHub Pages |
| `php/` | **Isolado / Desativado** | Desconectado do fluxo de execução oficial do app |

---

## 3. Modelo de Dados JSON

Os dados estão organizados em 7 arquivos principais na pasta `/data` (e espelhados em `/public/data` no build):

1. **`config.json`**: Parâmetros globais do jogo (concessão de 25 sementes, topologia 1-2-4-8, status ativo).
2. **`users.json`**: Participantes do jogo (id, username, nome, papel, status, árvore e posição).
3. **`wallets.json`**: Carteiras com o saldo recreativo de cada usuário.
4. **`trees.json`**: Árvores ativas e concluídas com suas 15 posições estruturadas (Tronco: 0, Ramos: 1-2, Galhos: 3-6, Folhas: 7-14).
5. **`referrals.json`**: Links de indicação e contadores de convites recreativos.
6. **`ledger.json`**: Livro-razão imutável de todas as concessões e transferências de sementes virtuais, protegido por `idempotencyKey`.
7. **`audit-log.json`**: Registro cronológico de auditoria com autor, ação e metadados.

---

## 4. Regras do Jogo e Motor `gameEngine.ts`

As regras foram implementadas como funções puras e imutáveis:
1. **Entrada por Indicação:** Um novo participante só pode entrar se informar o código/username de um membro ativo.
2. **Concessão de Boas-Vindas:** Ao se cadastrar, o participante recebe uma cota inicial gratuita de 25 sementes virtuais.
3. **Fortalecimento do Tronco:** Para ingressar em uma árvore, o participante transfere 25 sementes virtuais para o Tronco da árvore correspondente.
4. **Ocupação das Posições de Base (Folhas):** Os novos entrantes preenchem ordenadamente as vagas externas (posições de índice 7 a 14).
5. **Bifurcação da Árvore (Topologia 1-2-4-8):**
   - Quando a 15ª posição (8ª folha) é preenchida, a árvore mãe é marcada como `completed`.
   - O Tronco original conclui sua jornada recreativa.
   - São geradas duas novas árvores filhas:
     - **Filha Esquerda:** O Ramo Esquerdo (antiga pos 1) assume como novo Tronco; Galhos 3 e 4 tornam-se Ramos; Folhas 7 a 10 tornam-se Galhos; posições 7 a 14 ficam abertas para novos participantes.
     - **Filha Direita:** O Ramo Direito (antiga pos 2) assume como novo Tronco; Galhos 5 e 6 tornam-se Ramos; Folhas 11 a 14 tornam-se Galhos; posições 7 a 14 ficam abertas.
6. **Proteção de Idempotência:** Nenhuma operação com a mesma chave pode ser executada duas vezes.

---

## 5. Arquitetura de Gravação Segura (GitHub Actions)

Para evitar exposição de credenciais ou tokens no frontend:
- **Nenhum token do GitHub** é incluído no código JavaScript ou no navegador.
- O frontend opera em modo de leitura pública dos arquivos JSON e simulação local transparente.
- Quando publicado com integração total de backend assíncrono:
  - As ações do jogo acionam a GitHub Action via `workflow_dispatch` (ou webhook autenticado externamente).
  - O workflow `.github/workflows/update-game-data.yml` roda `scripts/process-game-action.ts` com concorrência travada (`concurrency: group: game-json-write, cancel-in-progress: false`).
  - A Action valida regras de saldo, vagas livres e duplicidade antes de gravar e commitar os novos JSONs.

---

## 6. Cobertura de Testes Automatizados

A suíte executada em `scripts/test-game-engine.ts` cobre 39 asserções rigorosas:
- Carregamento e consistência dos 7 esquemas JSON.
- Validação de links de indicação e cadastro fictício.
- Concessão inicial e débito/crédito na carteira.
- Ocupação sequencial das 8 vagas de folhas.
- Rejeição de requisições duplicadas por idempotência.
- Detecção de árvore 15/15, encerramento da árvore mãe e split perfeito em 2 árvores filhas ativas.
