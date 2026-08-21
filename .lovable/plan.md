# Plano de Implementação: Conectar Compra ao Cadastro de Cliente

Este plano visa garantir que as vendas sejam vinculadas corretamente aos clientes no banco de dados e que o cadastro pós-compra funcione de forma integrada.

## Alterações Técnicas

### 1. Backend e Queries (`src/lib/sales-queries.ts`)
- Atualizar a função `useCreatePendingSale` para aceitar um `customer_id` opcional.
- Passar esse ID para a RPC `create_pending_sale` no banco de dados.

### 2. Fluxo de Checkout (`src/pages/CheckoutPage.tsx`)
- Antes de gerar a venda, verificar se o usuário está logado.
- Se logado, obter ou criar o registro de cliente para a organização atual via RPC `get_or_create_customer`.
- Vincular o `customer_id` à venda pendente.

### 3. Gestão de Identidade do Cliente (`src/lib/customer-queries.ts`)
- Implementar `useMyCustomerRecords()` para buscar todos os registros de cliente (diferentes organizações) vinculados ao mesmo usuário.
- Atualizar `useCurrentCustomer()` para retornar o registro mais recente como padrão.
- Refatorar `useCustomerSales()` para usar a cláusula `IN`, permitindo que o cliente veja seus ingressos de todas as organizações no Dashboard "Meus Ingressos".

### 4. Cadastro Pós-Confirmação (`src/pages/ConfirmationPage.tsx` e `SignupPage.tsx`)
- Na tela de sucesso, o link de cadastro agora levará o `org_id` e o `whatsapp` do comprador via query string.
- Na tela de cadastro, o WhatsApp será pré-preenchido.
- Após o cadastro bem-sucedido, se um `org_id` estiver presente, o vínculo entre o novo usuário e a organização será criado imediatamente.

## Verificação
- Testar checkout logado e deslogado.
- Verificar se a venda aparece em "Meus Ingressos" após o login.
- Validar o fluxo de cadastro a partir da confirmação de compra.
