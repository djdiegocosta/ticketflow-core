# Vitrine — Banners

## Objetivo

A ferramenta **Admin → Ferramentas → Vitrine** permite criar, editar, ativar/desativar e excluir banners exibidos na área do cliente.

## Permissões

A tabela `public.client_banners` é protegida por RLS. Administradores autenticados podem realizar as operações de criação, leitura, atualização e exclusão.

A migration `20260924120000_fix_client_banners_admin_permissions.sql` corrige as permissões de tabela e explicita o `WITH CHECK` da política de administradores.

## Fluxo de criação

1. O administrador abre **Novo Banner**.
2. Preenche o título.
3. Pode informar texto auxiliar e link de destino.
4. Pode enviar uma imagem para o bucket de armazenamento utilizado pela organização.
5. Clica em **Criar Banner**.
6. O banner é salvo em `client_banners` e a lista é atualizada via React Query.

## Tratamento de erro

A mutation de criação exibe o erro retornado pelo backend em uma notificação, evitando que uma falha de permissão ou outro erro apareça para o usuário apenas como um botão sem resposta.

## Regra de segurança

A correção não altera o modelo de dados dos banners nem o fluxo público. Apenas restaura as permissões de escrita necessárias aos administradores e torna a política RLS de administração explícita para leitura/escrita.
