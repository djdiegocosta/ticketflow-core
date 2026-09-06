# TicketFlow — Skill de desenvolvimento

> Este arquivo existe para que agentes de código encontrem o caminho certo, mesmo procurando por `docs/skills/ticketflow-development.md`. Ele não duplica conteúdo — aponta para os documentos que já são a fonte de verdade do projeto.

## Antes de investigar ou alterar qualquer coisa

1. Leia **`docs/PROJECT-MAP.md`** primeiro — índice operacional de alta densidade do projeto (estrutura, rotas, funções do banco, convenções). É o índice para agentes.
2. Leia **`docs/TPS.md`** — especificação de produto oficial. Toda decisão de comportamento deve respeitar este documento.
3. Consulte **`docs/AUDITORIA.md`** — estado técnico vivo: problemas conhecidos, o que já foi corrigido, e por quem. Antes de assumir que algo "não está implementado", confira aqui — muitas vezes já foi corrigido diretamente em produção e só falta refletir na documentação.
4. Consulte **`docs/DESIGN-SYSTEM.md`** para qualquer trabalho de interface.
5. Consulte **`docs/CHANGELOG.md`** para o histórico cronológico de decisões — nunca é apagado, só corrigido com notas quando uma entrada antiga fica desatualizada.

## Convenções específicas deste repositório

- Migrations do Supabase em `supabase/migrations/`, nomeadas por timestamp. Sempre idempotentes (`CREATE OR REPLACE`, `ON CONFLICT DO NOTHING`) — o banco de produção às vezes já tem a correção antes da migration existir; o objetivo da migration nesses casos é reconciliar o repositório com a realidade, não mudar comportamento.
- Antes de alterar uma função do banco, comparar a definição versionada com a definição real em produção (`pg_get_functiondef`) — já houve casos de divergência real entre as duas (ver AUD-005 e AUD-006 em `docs/AUDITORIA.md`).
- Ao encontrar um problema novo (não listado em `AUDITORIA.md`), registrar lá seguindo o padrão existente: ID sequencial, severidade, problema, correção, evidência, data/hora/agente da resolução.

## Por que este arquivo é curto

`docs/PROJECT-MAP.md` já cumpre o papel de "mapa para agentes" com mais detalhe e é mantido atualizado a cada auditoria. Duplicar esse conteúdo aqui criaria duas fontes de verdade que divergem com o tempo — o padrão deste projeto é ter uma fonte por assunto.
