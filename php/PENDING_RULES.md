# Arboris - Registro de Regras de Negócio e Parâmetros Pendentes

Em conformidade com a seção 19 do projeto arquitetural, este documento registra formalmente todos os parâmetros e regras que foram isolados, parametrizados e marcados como **PENDENTE DE DEFINIÇÃO**.

Nenhuma dessas regras foi fixada ou inventada arbitrariamente. A arquitetura foi construída de forma modular para que estas políticas possam ser ativadas via banco de dados (`game_settings`) ou injeção de estratégias no `TreeEngine` e `TransferService`.

---

## 1. Valor Definitivo Transferido
* **Status**: `PENDENTE DE DEFINIÇÃO`
* **Implementação Arquitetural**: O `TransferService` consulta a tabela `game_settings` sob a chave `transfer_amount_default`. Caso não haja override, adota como padrão provisório o valor de entrada da categoria (25, 50 ou 100 fichas).
* **Parâmetro**: `transfer_amount_default`

## 2. Quantidade Recebida pelo Tronco
* **Status**: `PENDENTE DE DEFINIÇÃO`
* **Implementação Arquitetural**: A tabela `game_settings` inclui a chave `tronco_reward_multiplier`. Quando o ciclo da árvore for concluído (todas as 15 posições ocupadas), o ganho adicional do Tronco poderá ser aplicado via recompensa no Ledger (`type: CYCLE_REWARD`).
* **Parâmetro**: `tronco_reward_multiplier`

## 3. Multiplicadores
* **Status**: `PENDENTE DE DEFINIÇÃO`
* **Implementação Arquitetural**: Isolado na camada de configuração contábil do `LedgerService`. Não há multiplicadores embutidos em código-fonte; qualquer bonificação futura deverá gerar um registro de auditoria individual.

## 4. Critérios Finais de Progressão
* **Status**: `PENDENTE DE DEFINIÇÃO`
* **Implementação Arquitetural**: O método `TreeEngine::handleTreeFull()` detecta o preenchimento integral dos 4 níveis (15 posições) e finaliza o ciclo atual na tabela `tree_cycles`, registrando evento de auditoria sem alterar arbitrariamente posições até a definição da regra final.

## 5. Regras Completas de Divisão da Árvore (Bifurcação)
* **Status**: `PENDENTE DE DEFINIÇÃO`
* **Implementação Arquitetural**: Preparado o campo `parent_tree_id` na tabela `trees` e o parâmetro `tree_split_policy` em `game_settings`. Quando a regra for homologada, as posições 1 e 2 (Nível 1) tornar-se-ão os Troncos de duas novas sub-árvores filhas.

## 6. Reutilização de Fichas
* **Status**: `PENDENTE DE DEFINIÇÃO`
* **Implementação Arquitetural**: Parametrizado como `token_reuse_policy`. A contabilidade garante rastreabilidade total de origem/destino no Ledger, pronta para aceitar políticas de queima, recirculação ou carência.

## 7. Quantidade de Ciclos Permitidos
* **Status**: `PENDENTE DE DEFINIÇÃO`
* **Implementação Arquitetural**: Contador `cycle_number` nas tabelas `trees` e `tree_cycles`, pronto para impor restrições caso um limite máximo seja estipulado.

## 8. Participação Simultânea em Múltiplas Árvores
* **Status**: `PENDENTE DE DEFINIÇÃO`
* **Implementação Arquitetural**: Atualmente a restrição única `uq_tree_user_once` impede duplicidade na mesma árvore. A participação em árvores distintas é controlada pelo parâmetro `max_trees_per_user` em `game_settings`.

## 9. Regras Definitivas de Reinício
* **Status**: `PENDENTE DE DEFINIÇÃO`
* **Implementação Arquitetural**: Ciclo de vida da árvore suporta status `'completed'`. Métodos de reentrada dependem da definição de premiação e carência.

## 10. Limites de Indicações por Participante
* **Status**: `PENDENTE DE DEFINIÇÃO`
* **Implementação Arquitetural**: A tabela `referral_links` contabiliza `clicks` e `registrations_count` de forma independente, permitindo adicionar um `max_registrations` por link assim que definido.
