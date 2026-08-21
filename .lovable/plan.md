# Auditoria — Vitrine na Tela Inicial do Cliente

## 1. Diagnóstico
O banner ativo não está aparecendo na `/cliente` porque a consulta ao Supabase no hook `useActiveBanner` não está retornando dados, apesar de existir um banner ativo no banco. Isso ocorre provavelmente devido a **Políticas de RLS restritivas** que não permitem que o papel `authenticated` (atribuído ao cliente) leia a tabela `client_banners`, ou porque o `organization_id` do cliente logado não está sendo recuperado corretamente para filtrar o banner.

## 2. Ponto de falha
O problema está ocorrendo na etapa de **RLS / Consulta**.
- **Cadastro**: OK (Admin salva no banco).
- **Banco**: OK (Tabela e dados existem).
- **Storage**: OK (Arquivos acessíveis via URL pública).
- **Componente**: OK (Pronto para renderizar se receber o objeto `banner`).
- **Renderização**: Bloqueada pela ausência de dados no estado `banner`.

## 3. Evidências
- **Arquivo `src/lib/customer-queries.ts`**: O hook `useActiveBanner` (linhas 372-392) depende de `customer?.organization_id`. Se este ID for nulo ou a RLS bloquear, a query retorna vazio.
- **Arquivo `src/components/cliente/ClientVitrine.tsx`**: A linha 13 (`if (!banner) return null;`) confirma que o componente se oculta quando não há dados.
- **Banco de Dados**: A query manual confirmou a existência de um banner ativo (`is_active: true`) para a organização `07ac211b...`.
- **Fluxo Auth**: O `AuthContext` tenta carregar a `organization_id` da tabela `user_roles`. Se o cliente não tiver um registro lá, o `organization_id` será nulo.

## 4. Correção necessária
1. **Migração de RLS**: Adicionar permissão de leitura (`SELECT`) para o role `authenticated` na tabela `client_banners`.
   ```sql
   GRANT SELECT ON public.client_banners TO authenticated;
   CREATE POLICY "Allow authenticated users to read banners" ON public.client_banners FOR SELECT TO authenticated USING (true);
   ```
2. **Garantia de Organização**: Assegurar que ao criar um cliente (`customer`), ele seja associado a uma `organization_id` válida para que o filtro da vitrine funcione.
3. **Fallback no Hook**: Se o RLS permitir, remover a dependência estrita de `customer.organization_id` no hook de vitrine para testes, ou garantir que o `AuthContext` exponha corretamente essa informação para clientes.

NÃO implemente a correção ainda. A auditoria está concluída.

