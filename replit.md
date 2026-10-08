# Diretrizes do projeto

Deixe o projeto existente neste workspace em um estado limpo e consistente com o repositório remoto, preservando a estrutura e a arquitetura atuais.

O objetivo é manter este workspace como ambiente local de desenvolvimento do projeto.

## Fluxo de trabalho

1. O projeto existente no workspace será a base de desenvolvimento.
2. Analise, edite e implemente as alterações solicitadas diretamente nesse projeto.
3. O usuário utilizará o Git para revisar e enviar as alterações ao repositório remoto no GitHub.
4. Posteriormente, o Manus AI utilizará o conteúdo atualizado do repositório remoto para atualizar a aplicação na VPS.

Fluxo: workspace local → alterações e implementação → Git → repositório remoto no GitHub → atualização da VPS pelo Manus AI.

## Diretrizes obrigatórias

- Não altere o projeto integralmente.
- Antes de implementar qualquer modificação, analise o estado atual do código, a arquitetura, a estrutura de diretórios, as dependências e o fluxo relacionado à funcionalidade que será modificada.
- Faça implementações cirúrgicas e compatíveis com o projeto existente.
- Não recrie o projeto, substitua componentes funcionais sem necessidade, altere a arquitetura global nem introduza tecnologias, dependências, serviços ou padrões arquiteturais sem necessidade técnica comprovada.
- Preserve tudo que já funciona e modifique somente os arquivos e trechos necessários para atender ao requisito solicitado.
- Não faça refatorações paralelas ou melhorias fora do escopo.
- Antes de cada alteração:
  - identifique o comportamento atual;
  - localize os arquivos envolvidos;
  - verifique dependências e impactos;
  - determine a menor alteração necessária;
  - implemente mantendo compatibilidade com o restante do sistema.
- Após cada implementação, valide se o requisito foi atendido, se o comportamento relacionado continua funcionando, se não há regressões evidentes, se não houve alterações arquiteturais desnecessárias e se somente os arquivos necessários foram modificados.
- Não faça push, deploy ou alterações diretamente na VPS.
- A responsabilidade do agente termina nas alterações deste workspace. O usuário fará o envio para o GitHub, e o Manus AI atualizará a VPS a partir do repositório remoto.
