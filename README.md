# ARBORIS — API + MySQL

A branch main usa backend Node.js/TypeScript e MySQL.
Leia [instalação, migração, segurança e testes](docs/BACKEND_MYSQL.md).
A publicação anterior no GitHub Pages não é atualizada até configurar a API.

---

## Documentação histórica anterior à migração

# 🌳 Arboris — Jogo Comunitário de Reflorestamento Estático

> ⚠️ **AVISO FUNDAMENTAL — SISTEMA EXCLUSIVAMENTE LÚDICO / RECREATIVO:**  
> Este projeto é estritamente um jogo comunitário virtual inspirado na dinâmica de reflorestamento comunitário e árvores fractais (topologia 1-2-4-8).  
> **NÃO EXISTE DINHEIRO REAL, SAQUE, DEPÓSITO, INVESTIMENTO, PROMESSA DE GANHO OU TRANSFERÊNCIA FINANCEIRA.**  
> O sistema funciona exclusivamente com "sementes" virtuais fictícias que servem como pontuação interna recreativa do jogo.

---

## 📌 Sobre o Projeto

O **Arboris** é uma aplicação web **100% estática em React, TypeScript e Vite**, projetada para ser hospedada gratuitamente no **GitHub Pages**, utilizando **arquivos JSON versionados no próprio repositório** como base de dados transparente e auditável.

### Principais Características
- **100% Estático:** Não requer servidores PHP, Node.js rodando em segundo plano ou bancos SQL em produção.
- **Topologia Fractal 1-2-4-8:**
  - 1 Tronco (Centro)
  - 2 Ramos (Nível 1)
  - 4 Galhos (Nível 2)
  - 8 Folhas (Base / Entrada)
- **Mecânica Recreativa:**
  - Entrada exclusivamente por convite/indicação.
  - Concessão inicial gratuita de 25 sementes virtuais ao entrar.
  - Ocupação de vagas externas na base da árvore.
  - Ao preencher 15/15 posições, a árvore mãe é concluída e bifurca harmonicamente em duas novas árvores filhas ativas.
- **Auditoria e Ledger Imutável:** Histórico de todas as transferências com proteção contra duplicidade (`idempotencyKey`).
- **Gravação administrativa direta:** ações administrativas podem gravar `data/*.json` e `public/data/*.json` pela GitHub API usando fine-grained Personal Access Token informado localmente pelo administrador. O token não deve ser commitado.
- **Fluxos públicos:** podem continuar usando o fluxo automatizado por GitHub Actions quando aplicável.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 18+
- npm

### Comandos
```bash
# Instalar dependências
npm install

# Executar a suíte de 39 testes automatizados do jogo
npm run test:game

# Iniciar o servidor de desenvolvimento
npm run dev

# Compilar para produção (pasta dist/)
npm run build

# Visualizar a versão de produção localmente
npm run preview
```

---

## 📂 Estrutura de Dados (/data)

Os dados do jogo são armazenados como arquivos JSON simples:
- `data/config.json`: Configurações de regras e categorias.
- `data/users.json`: Lista de participantes e seus papéis.
- `data/wallets.json`: Saldos de sementes virtuais recreativas.
- `data/trees.json`: Árvores ativas e concluídas com posições mapeadas.
- `data/referrals.json`: Links de indicação e contadores de convites.
- `data/ledger.json`: Livro-razão contábil de sementes virtuais.
- `data/audit-log.json`: Registros cronológicos de auditoria.

---

## 📚 Documentação Completa

Para detalhes aprofundados sobre arquitetura, migração técnica e publicação:
- 📖 [Relatório Técnico de Migração e Arquitetura](docs/RELATORIO_TECNICO_E_MIGRACAO.md)
- 🛠️ [Guia Operacional: GitHub Pages e GitHub Actions](docs/GUIA_GITHUB_PAGES_E_ACTIONS.md)
