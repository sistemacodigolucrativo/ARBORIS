# Auditoria da apresentação pública — ÁRBORIS

Data: 06/10/2026. Repositório: sistemacodigolucrativo/ARBORIS.
Branch exclusiva: Refine_Presentation.
Base examinada: 3ebc8dc257b554b84a7a959c1a22d3751fd81b32.

## Conclusão

A apresentação anterior não explicava a doação exigida para ativação e vinculava recebimento financeiro a plantio sem respaldo no fluxo implementado. As correções tornam custos, etapas e dependência de novas entradas visíveis antes da decisão. Não comprovam aumento de conversão ou ROI. Não há dados de campanha, custos, atribuição ou experimento comparativo nesta auditoria.

O usuário determinou expressamente que o funcionamento não fosse modificado. Nenhum serviço, endpoint, motor de ciclos, permissão, banco, saldo ou configuração operacional foi alterado. As mudanças são de conteúdo e metadados, com associação acessível das respostas do FAQ.

## Escopo examinado

- `src/components/PublicLandingPage.tsx`: hero, cartões, CTAs, convite, condições e FAQ.
- `src/App.tsx`: página pública, entrada por indicação, regras compartilhadas, mensagens de convite e textos contraditórios no percurso.
- `src/communicationSanitizer.ts`: substituições de textos legados no DOM e compartilhamento.
- `index.html`: idioma, título, descrição e Open Graph.
- `src/services/gameEngine.ts`, `src/services/adminGameEngine.ts`, `src/services/dataStore.ts`, `src/types/game.ts`, `server/actions.ts`: confronto das afirmações com regras e persistência referenciadas.
- Busca no código por bag, sorteio, raffle e plantio; nenhum mecanismo operacional de acumulação ambiental ou sorteio localizado.

Esta é uma auditoria da copy e das regras necessárias para verificá-la, não uma certificação jurídica, ambiental, de segurança ou de produção.

## Confronto entre descrição e implementação

| Regra informada | Evidência no código | Tratamento nesta revisão |
| --- | --- | --- |
| Cadastro por link de indicação de uma árvore | `validateReferral` / `createParticipant`; também existe consulta por username, com fallback para árvore ativa | Explicação por convite; orientação para conferir a árvore; sem prometer que qualquer username sempre leva à árvore original |
| Árvore de S sementes concede 2S | `createParticipant`: `initialGrant = reservationAmount * 2` | Exemplo 25 → 50, explicitamente não universal |
| Reserva consome S sementes | `reserveTreeEntry`: débito, posição reservada e auditoria | Cadastro separado de reserva e ativação |
| Reserva alimenta uma bag | O débito não credita bag; nenhum saldo ambiental identificado | Proposta descrita como ainda não implementada |
| A cada 500 sementes, sorteio de 10 pessoas | Sem rotina, modelo ou registro identificado | Não anunciar como operação existente ou resultado ambiental comprovado |
| 1 semente corresponde a R$ 1 para a doação | Regra declarada pelo usuário; o código calcula quantidade e mostra Pix, mas não consulta banco nem comprova valor recebido | A equivalência foi atribuída à regra informada pelo projeto, diferenciando unidades internas de reais |
| Tronco confirma ativação após Pix | `request_activation` / `approve_activation_request`; administrador também pode aprovar | Confirmação descrita como manual, sem validação bancária automática |
| Sementes restantes desaparecem | Saem do participante, mas `approve_activation_request` credita `toWallet.balance` do Tronco | Diferença registrada e explicada; nenhum saldo foi alterado |
| Progressão e fechamento | `splitTreeIfComplete` exige 15 posições ativas | Correção da antiga expressão “14ª vaga externa”; existem 8 Folhas |
| Duas árvores após divisão | Mapas redistribuem 14 pessoas em 7 + 7; Tronco anterior sai | Duas árvores com 8 vagas cada, não duas árvores completas |

## Achados e gravidade

1. **Crítico — Associação causal indevida.** “Receba doações por plantar árvores” afirmava uma relação ausente das regras. O destinatário depende da posição no Tronco, não de comprovação de plantio. Chamada removida.
2. **Crítico — Custo omitido.** FAQ dizia que não era necessário entender antes de entrar; regras e convites afirmavam gratuidade e ausência de Pix. Condição financeira explicitada no hero, cartões, etapa de cadastro, regras e compartilhamento.
3. **Crítico — Dependência de novas entradas.** Recebimentos decorrem dos pagamentos de novos participantes. Isso exige avaliação jurídica do modelo real, independentemente dos nomes ajuda mútua, doação ou sementes. A revisão textual não regulariza o modelo e não deve ser usada como aprovação jurídica ou campanha de expansão.
4. **Alto — Promessa ambiental sem mecanismo comprovado.** Não há bag/sorteio implementado na versão examinada. Faltam critérios de elegibilidade, custeio de mudas, quantidade por selecionado, segurança/autorização do local, comprovação e manutenção. As 500 sementes internas não comprovam disponibilidade de R$ 500 para plantio. A proposta aparece como pendente; nenhuma quantidade de árvores plantadas foi inventada.
5. **Alto — Fluxo legado de ativação.** `server/actions.ts` ainda expõe `strengthen_tronco`; o motor pode ativar posição por sementes sem passar por `approve_activation_request`. Achado por leitura de código, não explorado em ambiente real. Precisa ser reconciliado com a exigência de confirmação Pix em tarefa funcional separada. Preservado por determinação do usuário.
6. **Alto — Contabilidade da reserva.** `reserveTreeEntry` debita carteira e grava auditoria, mas não lança `RESERVA_VAGA` no ledger. `recalculateWallet` soma o ledger, o que pode divergir do saldo após reserva. Achado estático, sem intervenção funcional.
7. **Médio — Condições de saída.** Não foram confirmadas regras públicas suficientes de desistência, devolução, prazo de ativação e contestação. A página recomenda esclarecer antes de transferir; não inventa direito, prazo ou garantia.
8. **Médio — Fechamento impreciso.** A expressão “14ª vaga externa” e árvores filhas “completas” contrariava a estrutura. Corrigidas para 15 posições ativas e duas árvores de 7 participantes + 8 vagas.
9. **Médio — SEO e compartilhamento.** Idioma `en`, descrições recreativas e promessa de gratuidade contrariavam a participação financeira. Metadados e mensagens alinhados.
10. **Baixo — Urgência e bastidores na copy.** Removida a chamada “Entre enquanto houver árvore ativa” e explicações sobre o que a página pública deveria revelar. Mantidos os destinos dos botões.

## Decisões de conteúdo

- Apresentação factual e condições antes do cadastro, sem otimização persuasiva baseada em expectativa de recebimento.
- Separação entre árvore virtual e plantio físico.
- Bag de 500 sementes / 10 selecionados identificada como proposta, não serviço já entregue.
- FAQ esclarece que 50 sementes não equivalem a R$ 50 disponíveis para saque.
- Recebimento, prazo e conclusão não são garantidos; o participante pode doar sem receber depois.
- Sem afirmações de que o sistema não participa da organização das doações: ele registra solicitações, destinatário e aprovação.
- Sem reestruturação visual ampla, alteração de handlers ou mudança de regras.

## Validação

- `npm run lint` (`tsc --noEmit`): aprovado.
- `npm run build`: aprovado, 1590 módulos transformados.
- Renderização React com `renderToStaticMarkup`, com e sem convite: aprovada; condições financeiras e risco presentes, exemplo de R$ 25, um H1 e identificação do convite conforme as props.
- `git diff --check`: aprovado.
- Validação visual/interativa em navegador: não realizada. Chromium indisponível e download retornou arquivo inválido. Renderização estática não substitui teste de layout, clique, FAQ ou responsividade.
- Sem execução de Pix, cadastro real, sorteio ou alteração de dados de participantes.
- ROI e aumento de conversão: não medidos. Qualquer alegação de melhoria percentual seria especulativa.

## Referência externa de risco

CVM, “Ofertas / Atuações irregulares”, consultada em 06/10/2026:
https://www.gov.br/cvm/pt-br/assuntos/protecao/alertas/ofertas-atuacoes-irregulares

A fonte descreve o risco de pagamentos sustentados pela entrada de novos participantes. A comparação aponta necessidade de análise jurídica; não constitui decisão definitiva sobre o enquadramento legal do ÁRBORIS.
