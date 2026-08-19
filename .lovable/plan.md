# Plano de Hardening: Checkout Público (Fluxo 1A)

Este plano visa blindar o fluxo de checkout contra manipulações, garantir a integridade dos dados e conformidade com a TPS.md.

## 1. Segurança e Integridade (Adversário)
- **Bloqueio de Manipulação de Preço**: A RPC `create_pending_sale` será revisada para ignorar qualquer valor monetário vindo do frontend, recalculando o total no banco usando o `batch_id` e a `quantity`.
- **Prevenção de Overselling**: Implementar decremento atômico de estoque com `UPDATE ... WHERE quantity >= ...` e verificação de validade do lote dentro da RPC.
- **Sanitização de Entradas**: Aplicar funções de sanitização para evitar injeção de scripts/HTML nos campos de nome.
- **Rate Limiting**: Adicionar controle na RPC para limitar a criação de vendas pendentes por IP ou WhatsApp em um curto intervalo.

## 2. Conformidade com TPS.md (Auditor)
- **Normalização de Dados**: Garantir que o WhatsApp seja salvo sempre com 13 dígitos (prefixo 55).
- **Validação de Nomes**: Aplicar `formatName` e `isFullName` no servidor (via RPC) para garantir a qualidade dos dados.
- **Expiração de Venda**: Criar lógica (via Cron ou trigger) para cancelar vendas pendentes após 30 minutos e liberar o estoque.

## 3. Experiência do Usuário (Borda)
- **Prevenção de Duplo Clique**: Desabilitar botões durante o processamento.
- **UX de Abandono**: Diferenciar abandonos antes e depois da geração do Pix na tabela `checkout_abandonments`.
- **Timer de Expiração**: Garantir que o frontend reflita exatamente o estado do banco quando o tempo esgotar.

## Detalhes Técnicos
- **RPCs Alteradas/Criadas**: `create_pending_sale` (Hardening), `track_checkout_abandonment` (Ajuste de flags).
- **Frontend**: `CheckoutPage.tsx` será atualizado para suportar o timer persistente e melhor tratamento de erros.
- **Database**: Novas triggers ou constraints para integridade de estoque.
