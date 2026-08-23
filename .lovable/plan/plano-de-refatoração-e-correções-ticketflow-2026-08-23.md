# Plano de Refatoração e Correções - TicketFlow

Este plano detalha as correções de performance, usabilidade e bugs solicitadas para o sistema TicketFlow, abrangendo desde a seleção de cidades até a blindagem do fluxo de checkout.

## 1. Cidade — Restringir ao Rio de Janeiro + opção "Outra"
**Arquivo:** `src/components/ui/city-autocomplete.tsx`
- Filtrar a lista inicial apenas para cidades do RJ usando `getCitiesByUF("RJ")`.
- Adicionar "Outra (fora do RJ)" como opção final.
- **Lógica de seleção:** Se "Outra" for selecionada, exibir um campo de texto (`Input` ou `CommandInput`) para entrada manual, enviando o valor digitado via `onChange`.
- **Benefício:** Redução de ~5.500 para ~93 itens, melhorando drasticamente a performance no mobile.

## 2. Seletor de Data/Hora — Acessibilidade Mobile
**Arquivos:** `src/pages/admin/CreateEventPage.tsx` e `src/pages/admin/EditEventPage.tsx`
- Adicionar `pointer-events-none` aos ícones de calendário e relógio que sobrepõem os inputs de data/hora.
- Isso garante que o clique do usuário atinja o `input` nativo, abrindo o seletor do sistema operacional no celular.

## 3. Disponibilidade Real de Lotes no Checkout
**Arquivos:** `src/lib/customer-queries.ts`, `src/pages/PublicEventPage.tsx`, `src/pages/CheckoutPage.tsx`
- **Hook:** Criar `useAvailableBatches` chamando a RPC `get_available_batches`.
- **UI:** Substituir `event.ticket_batches` pelo novo hook nas páginas públicas, garantindo que apenas lotes válidos (estoque, data e não-cortesia) sejam exibidos.

## 4. Logo TicketFlow no Tema Claro
**Arquivo:** `src/pages/LoginPage.tsx`
- Corrigir a classe do `<h1>` para `text-[var(--text-primary)]`.
- A variável CSS já gerencia a alternância entre branco (escuro) e preto (claro) automaticamente.

## 5. Campo Sexo
**Arquivos:** `src/pages/SignupPage.tsx`, `src/routes/cliente.perfil.tsx`, `src/lib/customer-queries.ts`
- Adicionar seletor com as opções: Masculino, Feminino e Prefiro não informar.
- Atualizar hooks de busca e mutação (`useCurrentCustomer`, `useUpdateProfile`) para persistir o campo no banco via RPC `update_customer`.

## 6. Correção de Data de Nascimento (Bug do Nulo)
**Arquivos:** `src/lib/customer-queries.ts` (`useUpdateProfile`) e `src/lib/customers-queries.ts` (`useUpdateCustomer`)
- Alterar o fallback de `""` (string vazia) para `null` ao enviar datas para o banco.
- Evita erros de conversão de tipo no PostgreSQL.

## 7. Preservação de Dados no Admin
**Arquivo:** `src/lib/customers-queries.ts` (`useUpdateCustomer`)
- Remover o envio de `_cidade: ""` e `_instagram: ""` no payload da mutação do admin.
- Garante que a edição de um cliente não apague dados que não estão sendo editados no painel lateral.

## Detalhes Técnicos
- Uso de RPCs do Supabase para integridade de dados.
- Tailwind CSS v4 para estilização sem hardcoding de cores.
- TanStack Query para gerenciamento de estado e cache.
- Zod para validação robusta no frontend.
