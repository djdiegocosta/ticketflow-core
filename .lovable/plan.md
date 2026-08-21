# Plano de Implementação: Área do Cliente e Vitrine

Este plano detalha a implementação das funcionalidades da Área do Cliente (Mensagem de Boas-Vindas e Vitrine) e a gestão de Banners no Admin, conforme os Critérios de Conclusão.

## 1. Banco de Dados e API

- A tabela `client_banners` já existe no banco de dados.
- Criar hooks de query/mutation para `client_banners` em `src/lib/customer-queries.ts` (para o cliente) e `src/lib/settings-queries.ts` (para o admin).
- Criar a RPC `get_active_banner` para buscar o banner ativo da organização vinculada ao cliente.

## 2. Admin: Vitrine de Banners

- Criar a página `src/pages/admin/VitrinePage.tsx` para gerenciar os banners (CRUD).
- Criar a rota `src/routes/admin.ferramentas.vitrine.tsx`.
- Adicionar o card "Vitrine" em `src/routes/admin.ferramentas.index.tsx`.
- Implementar upload de imagem para o bucket `organization-logos` (ou criar um novo bucket `banners` se preferível).

## 3. Área do Cliente: Mensagem de Boas-Vindas

- Ajustar a lógica de saudação em `src/routes/cliente.index.tsx` baseada na flag `isSplashComplete` do `AuthContext` ou um estado de "primeiro acesso" persistido.
- Implementar as variantes: "Que bom que você chegou! Seja bem-vindo(a)!" (primeiro acesso) e "Bom ver você aqui de novo!" (retorno).

## 4. Área do Cliente: Vitrine (Banner)

- Criar o componente `src/components/cliente/ClientVitrine.tsx` para exibir o banner ativo.
- Integrar o banner na `Page_cliente_index` em `src/routes/cliente.index.tsx`.
- Suportar banners com imagem (proporção 9:16) ou apenas texto.

## 5. Páginas do Cliente (Hardening)

- Revisar `cliente.ingressos`, `cliente.pontos` e `cliente.perfil` para garantir que exibam dados reais do Supabase e sigam o design system.

## Detalhes Técnicos

- **Tabela `client_banners`**: `id`, `organization_id`, `title`, `text_content`, `image_url`, `link_url`, `is_active`.
- **Lógica de Ativação**: Ao ativar um banner, desativar os outros da mesma organização.
- **Segurança**: RLS em `client_banners` permitindo `SELECT` para autenticados e gestão para `admin`.
