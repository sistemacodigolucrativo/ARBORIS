# Auditoria visual da árvore — 2026-10-05

Escopo: modelo radial padrão (modelo 1), nas visões de membro e administrador. Referência: imagem vertical enviada pelo responsável pelo projeto. Base auditada: `0c0d0a5620c156b1b5bca2353f22cc6a7efab133`.

## Causas encontradas

- O fundo SVG anterior era uma representação simplificada, diferente da ilustração solicitada.
- O tabuleiro fixo de 330 × 330 px não compartilhava a proporção vertical da referência; `background-size: cover` cortava o cenário.
- CSS com seletores baseados nas classes utilitárias e `:has()` competia com o componente.
- `arboris-leaf-nodes.js` observava o documento e reescrevia HTML/estilos geridos pelo React, substituindo círculos por folhas.

## Correções

- `src/components/TreeBoard.tsx` e `.css` passam a controlar fundo, cabeçalhos, conexões, círculos e legenda no mesmo sistema proporcional 2:3.
- Fundo completo, sem corte de copa ou raízes, em `src/assets/arboris-tree-scene.webp` (1024 × 1536, aproximadamente 121 KiB). Importação pelo Vite gera URL com hash e respeita `/ARBORIS/`.
- Tronco dourado, posições ativadas verdes, reservadas rosas e vagas escuras tracejadas. Os rótulos acessíveis também comunicam o estado.
- As 15 posições reais são mantidas; a referência mostra apenas 11. Foram acomodadas as posições 3–6 sem alterar a hierarquia.
- Seleção usa os mesmos dados e callback do aplicativo, agora em botões acessíveis por teclado. Nomes longos têm reticências e texto completo no título/rótulo acessível.
- Removidos o carregamento do script de folhas e os estilos antigos conflitantes. Arquivos antigos em `public/assets` não são utilizados pelo novo tabuleiro.
- Modelos alternativos 2–4 preservados. Sem mudanças na API, MySQL, pagamentos ou regras do jogo.

## Origem da arte

Modo: edição da imagem de referência com `image_gen`. Fundo reconstruído sem textos, botões, círculos e conexões; esses elementos são renderizados pelo React. Conversão de formato para WebP com qualidade 88, sem alterar o enquadramento.

Prompt: “Clean background plate only. Remove all UI, text, numbered circles, gold crown, names, glowing connections, legend and administrative panel. Reconstruct tree, branches, leaves, sky and grass. Preserve the lush hand-painted cartoon aesthetic, sunny blue sky, clouds, distant blue mountains, centered textured brown trunk and flared roots. Portrait 2:3, crown starts about 14% from top, trunk at 50% width, roots at 82% height. Keep whole tree visible. No text, logo, diagram, tokens or UI.”

## Validação

- `npm run lint`: passou (TypeScript).
- `npm run build`: passou; arte emitida pelo Vite com hash.
- Renderização React em teste local: 15 botões, 14 conexões, estados ativo/reservado/vago, identificação de usuário e escape de nomes HTML verificados.
- Inspeção da imagem WebP: copa e raízes completas, sem interface gravada na arte.
- **Pendente:** inspeção da página renderizada em navegador e teste real de cliques/teclado em 320, 390, 768 e 1440 px. O navegador remoto bloqueou a prévia local; Chromium local não iniciou neste ambiente. Não houve validação visual ponta a ponta nem alteração na VPS.

Para publicar: executar o procedimento de atualização/build já utilizado na VPS. Após publicar, verificar o modelo 1 nas visões de membro e administrador, os 15 cliques, estados e ausência de rolagem horizontal nas larguras acima.

## Atualização: posições em formato de folhas

A pedido do responsável, os círculos laterais foram substituídos por folhas individuais. As sete posições à esquerda (1, 3, 4, 7, 8, 13, 14) apontam para cima e para a esquerda (↖); as sete à direita (2, 5, 6, 9, 10, 11, 12), para cima e para a direita (↗). A direção segue a coordenada visual, e não a numeração ou os dados de `side`.

O contorno é aplicado ao próprio botão em CSS, com ponta no canto superior externo, base arredondada e nervuras SVG discretas. Os textos permanecem horizontais. Cores de estado, contorno tracejado das vagas, foco de teclado e seleção são preservados. A legenda acompanha o novo formato; o tronco central mantém o medalhão dourado. O ZIP enviado contém uma copa agrupada, utilizada como referência de estilo, sem adicionar uma imagem de copa a cada posição.

Validação desta atualização: TypeScript, build e renderização React com 7 folhas de cada orientação e 1 tronco. A validação visual no navegador continua pendente pela limitação de ambiente registrada acima.
