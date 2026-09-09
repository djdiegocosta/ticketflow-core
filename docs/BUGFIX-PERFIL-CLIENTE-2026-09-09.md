# Correção — Persistência do perfil do cliente

**Data:** 09/09/2026  
**Área:** `/cliente/perfil`  
**Status:** Correção preparada em branch de correção.

## Problemas identificados

1. A área de perfil chama a RPC `update_customer`, cuja implementação versionada possui 8 argumentos.
2. Uma migration de hardening anterior revogava execução de uma assinatura antiga de 7 argumentos. A proteção não estava alinhada com a assinatura vigente.
3. Após o salvamento, o front-end invalidava a chave `current-customer`, mas a consulta usada por `useCurrentCustomer()` é `my-customer-records`. Portanto, os dados exibidos podiam permanecer em cache mesmo após uma atualização bem-sucedida.
4. A RPC anterior usava `coalesce()` nos campos opcionais. Isso impedia limpar cidade, data de nascimento, Instagram ou sexo quando o usuário removia o valor.

## Correção

- Recriar `public.update_customer` com a assinatura vigente de 8 argumentos.
- Garantir execução apenas para usuários autenticados.
- Manter a autorização: o próprio cliente pode editar seus dados; administrador pode editar clientes da organização.
- Persistir os campos enviados pelo formulário, inclusive permitindo limpar campos opcionais.
- Invalidar a query real `my-customer-records` após o salvamento.
- Aguardar a invalidação antes de informar sucesso, para que a tela seja sincronizada com o banco.

## Observação operacional

A correção SQL foi adicionada ao repositório como migration. A conexão atual do agente com o projeto Supabase não possui permissão para aplicar DDL diretamente; portanto, a migration deve ser aplicada pelo fluxo autorizado de deploy/migrations antes de considerar a correção SQL efetivamente publicada no banco.

## Validação esperada

1. Alterar nome, WhatsApp, e-mail e cidade em `/cliente/perfil`.
2. Salvar e confirmar a mensagem de sucesso.
3. Recarregar a página.
4. Confirmar que os valores permanecem alterados.
5. Limpar os campos opcionais e salvar.
6. Recarregar e confirmar que os campos permanecem vazios.
7. Conferir o registro correspondente em `customers` no Supabase.
