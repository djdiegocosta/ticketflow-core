# Plano de Implementação: Etapa 5 — Área Pública e Área do Cliente

Conectar as interfaces públicas e do cliente ao Supabase, substituindo os dados mockados por consultas reais e implementando o fluxo de compra persistente.

## 1. Fundação de Dados e Queries
- Criar `src/lib/customer-queries.ts` com hooks especializados para o cliente logado e consultas públicas (venda por código, ticket por código, eventos por slug).
- Tratar a tipagem da tabela `sales` para garantir que as consultas funcionem corretamente com o schema atual.

## 2. Página do Evento e Checkout
- **PublicEventPage**: Buscar dados reais de `events` e `ticket_batches` via slug.
- **CheckoutPage**:
  - Implementar chamada à RPC `create_pending_sale` para validar estoque e criar a venda.
  - Implementar tracking de abandono via RPC `track_checkout_abandonment` em caso de saída precoce.
  - Atualizar simulação de pagamento para chamar RPC `confirm_sale_paid`, gerando ingressos reais no banco.

## 3. Confirmação e Detalhe de Ingressos
- **ConfirmationPage**: Buscar dados da venda e tickets via RPCs `get_sale_by_code` e `get_tickets_by_sale_code`.
- **MyTicketsPage**: Permitir busca manual por código ou listagem automática se o usuário estiver logado.
- **TicketDetailPage**: Buscar detalhes reais do ticket e evento associado via `ticket_code`.

## 4. Área do Cliente
- **Dashboard (/cliente)**: Substituir contadores fixos por dados reais do `customer` e suas vendas pagas.
- **Meus Ingressos (/cliente/ingressos)**: Listar tickets reais com filtros de data. Sincronizar com o `offlineDB` já existente.
- **Perfil (/cliente/perfil)**: Carregar dados do `customer` e implementar atualização via RPC `update_customer`.
- **Pontos (/cliente/pontos)**: Exibir saldo e histórico real da tabela `points_ledger`.

## 5. Cadastro e Auth
- **SignupPage**: Garantir que o fluxo utilize `supabase.auth.signUp` com os metadados corretos para acionar a criação automática do `customer` via trigger/função do banco.

---

### Detalhes Técnicos
- Utilizar `supabase.rpc()` conforme a regra crítica para todas as operações de escrita.
- Manter o suporte offline (IndexedDB) alimentado por dados reais.
- Tratar erros de "Estoque insuficiente" e "Venda não encontrada" de forma amigável.
