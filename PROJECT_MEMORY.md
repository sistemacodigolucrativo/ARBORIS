# Estado atual: migração para API + MySQL

Pedido vigente: backend real com MySQL na main, substituindo JSON/GitHub API.
Consulte docs/BACKEND_MYSQL.md. O frontend exige API; nenhuma senha padrão.
Hospedagem e credenciais de produção não foram fornecidas.

## Histórico anterior (não usar como arquitetura vigente)

# 🧠 MEMÓRIA PERSISTENTE DO PROJETO — ARBORIS REFLORESTAMENTO

> **Documento Vivo de Engenharia e Conhecimento Arquitetural**  
> **Última Atualização:** 04 de Outubro de 2026  
> **Status do Projeto:** Frontend 100% Estático · Motor Determinístico Ativo · 39 Testes Aprovados · Zero Resíduos Legados
> **Nota operacional:** deploy acionado após correção do fluxo de criação de árvores pelo painel administrativo.
> **Correção validada:** criação de árvore pelo painel administrativo agora usa dispatcher automático seguro para `create_tree`, sem abrir issue manual quando o executor estiver configurado.
