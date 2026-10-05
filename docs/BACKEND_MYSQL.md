# Backend MySQL do ARBORIS

## Arquitetura

React/Vite → API Node.js/Express/TypeScript → MySQL 8.4 (InnoDB).
O servidor executa os motores existentes de cadastro, fortalecimento e administração.
O MySQL passa a ser a fonte de verdade. O navegador não grava JSON, não recebe PAT,
não escolhe a identidade do ator e não persiste o estado do jogo em localStorage.

Tabelas: users, wallets, trees, tree_positions, referrals, ledger, audit_log,
game_config, credentials, sessions, action_requests e tabelas de migração/lock.
Configuração e metadados de auditoria usam colunas JSON; usuários, saldos, árvores,
posições e lançamentos usam linhas relacionais, índices e chaves estrangeiras.

Cada mutação obtém `SELECT ... FOR UPDATE` na linha game_lock, carrega o estado,
valida permissões/regras, grava os registros alterados e confirma uma única transação.
Uma falha reverte também créditos, credenciais e chave de idempotência.
A chave identifica ator e conteúdo; repetição devolve o resultado salvo; conteúdo
ou ator diferente recebe 409. O cliente conserva a chave em memória após falha de rede.
Depois de recarregar a página, a chave pendente não é recuperada automaticamente.

Este desenho conserva os motores puros atuais e prioriza consistência no MVP.
Carrega o estado completo internamente e serializa as escritas; não é uma solução de
alta concorrência. Evolução futura: consultas paginadas e locks por árvore/carteira.

## Inicialização local

Requisitos: Node.js 22.9+ e MySQL 8.4. Crie um banco UTF8MB4 e um usuário restrito a
esse banco. Use credencial com DDL para migrações e DML para a aplicação em produção.

1. `npm ci`
2. Copie `.env.example` para `.env` e configure `DATABASE_URL`.
3. `npm run db:migrate`
4. `npm run db:import`
5. Configure `ACCOUNT_USERNAME=admin` e `ACCOUNT_PASSWORD` (12–128 caracteres) no
   ambiente privado; execute `npm run db:password` e remova essas variáveis.
6. `npm run api:dev` e, em outro terminal, `npm run dev`.
7. Abra `http://localhost:3000/ARBORIS/` e entre com usuário e senha.

A importação é **explícita e somente para banco vazio**. Ela copia `data/*.json`,
incluindo os participantes de demonstração atualmente presentes. Não limpa nem
altera arquivos de origem. Para outra base, use `IMPORT_DATA_DIR` apontando para os
sete JSONs compatíveis. Faça backup e confira os registros antes da importação.
Contas importadas não têm senha padrão: provisione individualmente com db:password.
O mesmo comando redefine senha e revoga as sessões dessa conta.

A base atual contém saldo administrativo sem lançamento correspondente no ledger;
a importação preserva essa divergência histórica, sem inventar ajustes contábeis.

## Hospedagem

GitHub Pages não executa Node nem MySQL. É necessário um serviço que execute a API e
um MySQL acessível apenas ao servidor. Nenhuma hospedagem é criada por este commit.

Opção simples: API serve `/api` e o build React em `/ARBORIS/`, sob o mesmo domínio
HTTPS. Execute `npm ci`, `npm run build` e `npm start`, com NODE_ENV=production e
APP_ORIGINS contendo a origem exata do site. Configure proxy HTTPS e reinício do
processo. Use TRUST_PROXY_HOPS somente para a quantidade real de proxies confiáveis.

Docker Compose está incluído. Configure MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD,
DOCKER_DATABASE_URL (host `db`, senha codificada como URL), APP_ORIGINS e demais
variáveis em `.env` privado. Rode:

```sh
docker compose build api
docker compose up -d db
docker compose run --rm api npm run db:migrate
docker compose run --rm api npm run db:import
# Configure ACCOUNT_USERNAME e ACCOUNT_PASSWORD no .env privado antes deste comando.
docker compose run --rm api npm run db:password
# Remova as duas variáveis de provisionamento antes de iniciar a API.
docker compose up -d api
```

A porta 3001 fica restrita ao loopback do host e precisa de proxy HTTPS. O MySQL não
publica porta no host; os dados ficam no volume mysql_data. Não use `down -v` sem
backup. O Dockerfile e o Compose são instruções de implantação; sua execução deve
ser validada na hospedagem escolhida.

Para manter Pages como frontend: defina a variável do repositório
`ARBORIS_API_BASE_URL=https://api.seudominio/api`, configure APP_ORIGINS com a origem
exata do Pages, NODE_ENV=production e COOKIE_CROSS_SITE=true na API. O deploy Pages
fica suspenso enquanto a variável não existir, preservando o último site publicado.
Cookies entre sites dependem das políticas do navegador; preferir o mesmo domínio.
VITE_API_BASE_URL é pública; DATABASE_URL e senhas nunca recebem prefixo VITE_.

## Segurança e contrato

- Login por senha scrypt com salt aleatório; sessão aleatória armazenada como hash
  no MySQL, cookie HttpOnly, Secure em produção, validade de 12h, logout e revogação.
- Usuário bloqueado perde acesso e sessões. Administradores não podem ser bloqueados
  pela operação de suspensão de membros. Nenhuma conta é promovida pelo navegador.
- Origem permitida exata, cabeçalho customizado em POST, JSON limitado a 16 KB,
  validação de entrada, consultas parametrizadas, limitação de tentativas por IP.
- GET /state anônimo retorna configuração sem participantes, saldos ou auditoria.
  Membro recebe sua árvore, carteiras/lançamentos/indicações próprios; admin recebe
  o estado completo. Nenhuma resposta inclui hashes de senha ou sessão.
- Rate limiting em memória por processo: implantações com múltiplas réplicas precisam
  de limitador compartilhado/gateway. Cadastro público não tem captcha/verificação
  externa; isso não impede múltiplas contas abusivas por pessoas diferentes IPs.

| Método | Rota | Uso |
| --- | --- | --- |
| GET | /api/health | Banco acessível e inicializado |
| GET | /api/state | Estado filtrado pela sessão |
| GET | /api/referrals/validate?value=... | Validar indicador/token |
| POST | /api/auth/login | username, password |
| POST | /api/auth/logout | Encerrar sessão |
| POST | /api/register | firstName, lastName, indicadorUsername, password |
| POST | /api/admin/users | Mesmo cadastro, exige admin |
| POST | /api/actions | action, params; exige sessão |

Cadastro e ações exigem `Idempotency-Key` (16–128 caracteres alfanuméricos, _ ou -).
POST exige `Content-Type: application/json` e `X-Arboris-Client: web`.
Ações: strengthen_tronco, transfer_seeds, create_tree, archive_tree,
assign_tree_position, clear_tree_position e toggle_user_status. O ator é derivado
exclusivamente da sessão. As cinco últimas são administrativas.

## Testes e operação

`npm run lint`, `npm run test:game`, `npm run test:api`, `npm run build`.
A integração exige `TEST_DATABASE_URL` apontando para um banco **vazio e descartável**
cujo nome termina em `_test`. Sem variável, esse teste é marcado como ignorado.
`REQUIRE_MYSQL_TESTS=true` torna a ausência um erro. O CI provisiona MySQL 8.4 e exige
a integração: cadastro, login, autorização, CSRF, rollback, repetição concorrente,
concessões concorrentes, bifurcação, árvores, posições, bloqueio, logout e persistência/reinício.
O CI também executa um teste Chromium em viewport de celular: login, criação pelo
painel persistida no MySQL, acesso de membro, recarga da sessão e logout.

Faça backup MySQL e teste restauração antes da migração de produção. Os JSONs em data/
são apenas a entrada histórica de importação. Os workflows antigos que gravavam JSON
ou reaplicavam patches foram removidos; documentos antigos descrevem o sistema anterior.

## Referências técnicas

- https://sidorares.github.io/node-mysql2/docs/documentation
- https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html
- https://nodejs.org/api/crypto.html

A auditoria npm identificou avisos no Vite/esbuild da ferramenta de desenvolvimento
herdada. Esses pacotes ficam em devDependencies e não entram na instalação runtime
`npm ci --omit=dev`. Não exponha o servidor de desenvolvimento na internet.
