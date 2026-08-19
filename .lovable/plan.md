# Plano: Blindagem de Rate Limiting (Fluxo 1A - Checkout Público)

Para concluir a fundação do Checkout Público (Fluxo 1A), implementarei o controle de taxa (Rate Limiting) no backend. Isso evitará ataques de flood que poderiam esgotar o estoque através de múltiplas reservas pendentes (vendas "sem pix").

## Detalhes Técnicos

### Backend (Supabase/PostgreSQL)
1. **Tabela de Auditoria de Rate Limit**: Criar `public.checkout_rate_limits` para rastrear tentativas por WhatsApp e/ou IP (usando metadados da requisição se disponível, ou apenas WhatsApp como identificador primário de negócio).
2. **Atualização da RPC `create_pending_sale`**:
   - Integrar verificação de limite: Permitir no máximo X tentativas de reserva por WhatsApp em um intervalo de Y minutos.
   - Registrar cada tentativa na tabela de auditoria.
   - Lançar exceção customizada se o limite for excedido.
3. **Manutenção Automática**: Adicionar lógica para expurgar registros antigos da tabela de auditoria para manter a performance.

### Frontend
1. **Tratamento de Erros no Checkout**: Garantir que o `CheckoutPage.tsx` capture o erro de rate limit retornado pela RPC e exiba um `toast` amigável ao usuário.

## Etapas
1. Criar migração SQL com a nova tabela e lógica de controle.
2. Atualizar a função RPC no banco de dados.
3. Validar o comportamento no frontend simulando múltiplas tentativas.
