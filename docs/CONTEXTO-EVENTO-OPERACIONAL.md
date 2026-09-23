# Contexto de Evento Operacional

## Objetivo

Definir uma regra única para determinar qual evento está em operação no TicketFlow e impedir que dados de eventos encerrados apareçam nas telas operacionais.

## Regra central

O TicketFlow opera **um único Evento Operacional por vez**.

Um evento pode ser considerado operacional quando:
- está publicado;
- não está encerrado (is_closed = false).

A seleção deve seguir a regra já existente em getOperationalEvent():
1. se houver um evento publicado e aberto em andamento, ele tem prioridade;
2. caso contrário, selecionar o próximo evento publicado e aberto;
3. se não houver nenhum evento publicado e aberto, não existe Evento Operacional.

Um evento encerrado nunca pode voltar a ser o Evento Operacional.

## Comportamento após encerramento

Ao encerrar um evento:
1. o encerramento grava o snapshot histórico;
2. o evento passa a is_closed = true;
3. ele deixa imediatamente de ser o Evento Operacional;
4. o sistema procura automaticamente o próximo evento publicado e aberto;
5. se existir, esse evento passa a ser o contexto das telas operacionais;
6. se não existir, as telas operacionais devem apresentar estado vazio — nunca dados históricos.

## Separação entre operação e histórico

### Operação

As telas operacionais trabalham exclusivamente com o Evento Operacional atual:
- Dashboard;
- Vendas;
- Cortesias;
- Check-in;
- Remarketing;
- demais ferramentas que representem a operação corrente.

Essas telas não devem usar dados de toda a organização como fallback quando não existe Evento Operacional.

### Gestão de eventos

A área de Eventos pode consultar eventos anteriores, inclusive encerrados.

Eventos encerrados devem ser tratados como históricos para fins operacionais e não devem continuar oferecendo ações que alterem a operação daquele evento.

### Histórico de Eventos

O Histórico de Eventos é a fonte de consulta do resultado consolidado de eventos encerrados.

O snapshot de encerramento deve ser considerado a referência histórica congelada.

## Regra de consulta de dados

Sempre que possível, o identificador do Evento Operacional deve chegar à consulta no backend/query layer.

Preferir:

useOperationalEvent()
        ↓
     eventId
        ↓
query filtrada pelo eventId

Evitar:

query de todos os eventos da organização
        ↓
filtro posterior no React

Isso reduz risco de vazamento de dados históricos, diminui dados carregados e torna a regra difícil de ser esquecida em novas funcionalidades.

## Comportamento quando não existe Evento Operacional

Nunca utilizar "Todos os eventos" como fallback nas telas operacionais.

Exemplo de estado vazio:

**Nenhum evento ativo**

Crie ou publique um novo evento para começar a operação.

A tela pode oferecer uma ação como:
**Ir para Eventos**

Não devem aparecer nesse estado:
- receita histórica;
- vendas históricas;
- gráficos históricos;
- check-ins históricos;
- cortesias históricas;
- dados pendentes de eventos encerrados;
- indicadores operacionais de eventos anteriores.

## Público e vendas

O fechamento de um evento não apaga seus dados.

Os dados permanecem consultáveis no Histórico de Eventos e nas áreas administrativas apropriadas.

Porém, eles não devem contaminar:
- vendas do evento atual;
- indicadores do Dashboard;
- contagem operacional de cortesias;
- check-in corrente;
- remarketing corrente.

## Evento público encerrado

Um evento encerrado não deve continuar funcionando como evento público ativo.

A página pública deve reconhecer o estado encerrado e impedir a continuidade normal para compra.

A proteção de backend permanece obrigatória. As funções de disponibilidade e criação de venda já possuem verificações de evento publicado e não encerrado.

Links antigos de checkout também devem falhar com segurança no backend.

## Check-in

O check-in deve sempre estar associado ao Evento Operacional.

Após o encerramento:
- o evento encerrado deixa de ser o contexto corrente;
- seus check-ins continuam disponíveis para consulta histórica;
- o check-in de um novo evento deve assumir automaticamente o novo Evento Operacional.

## Remarketing

Remarketing operacional deve trabalhar com o Evento Operacional.

A consulta de eventos históricos pode continuar existindo quando necessária para gestão, mas não deve permitir que um evento encerrado seja tratado como contexto operacional atual por padrão.

## Eventos encerrados e edição

O encerramento cria um registro histórico congelado.

Por isso, alterações posteriores na configuração de um evento encerrado não devem alterar o resultado apresentado no Histórico de Eventos.

Quando possível, eventos encerrados devem ter suas ações operacionais bloqueadas ou convertidas para modo de consulta.

## Contrato para novas funcionalidades

Toda nova funcionalidade que trabalhe com dados de evento deve responder primeiro:

"Estou trabalhando com o Evento Operacional ou com dados históricos?"

Se for operação:
- obter o Evento Operacional;
- exigir seu eventId;
- filtrar os dados por esse evento;
- tratar ausência de Evento Operacional com estado vazio.

Se for histórico:
- consultar explicitamente o evento histórico;
- não alterar o contexto operacional.

## Critérios de aceite

1. um evento encerrado deixa imediatamente de ser Evento Operacional;
2. o próximo evento publicado e aberto assume automaticamente o contexto;
3. sem evento aberto, Dashboard e demais telas operacionais mostram estado vazio;
4. nenhum dado de vendas de evento encerrado aparece como dado operacional;
5. cortesias seguem o mesmo isolamento;
6. check-in segue o mesmo isolamento;
7. remarketing operacional segue o mesmo isolamento;
8. um evento encerrado não pode continuar sendo comprado;
9. a consulta histórica continua funcionando;
10. o snapshot histórico continua sendo a referência do evento encerrado;
11. testes cobrem pelo menos os cenários de evento único encerrado, próximo evento aberto e ausência total de evento operacional.

## Implementação planejada

1. consolidar o contexto operacional existente;
2. corrigir Dashboard;
3. corrigir Vendas;
4. corrigir Cortesias;
5. corrigir Check-in;
6. corrigir Remarketing;
7. ajustar página pública/checkout de evento encerrado;
8. implementar estados vazios sem evento operacional;
9. bloquear ações operacionais em eventos encerrados;
10. adicionar testes para impedir regressões.

## Restrições

- Não criar um segundo mecanismo paralelo de seleção de evento.
- Reutilizar e fortalecer getOperationalEvent() / useOperationalEvent().
- Não alterar o fluxo de pagamento sem necessidade.
- Não remover a possibilidade de consultar eventos encerrados.
- Não apagar dados históricos.
- Preservar o design system existente.
- Documentar alterações adicionais relevantes em /docs.

## Referências

- src/lib/events-queries.ts
- docs/PROJECT-MAP.md
- docs/HISTORICO-DE-EVENTOS.md
- src/pages/AdminDashboard.tsx
- src/pages/admin/SalesListPage.tsx
- src/pages/admin/CourtesiesListPage.tsx
- src/pages/admin/RemarketingPage.tsx
- src/pages/PublicEventPage.tsx
- src/pages/admin/EventsListPage.tsx


## Implementação da primeira etapa

A primeira etapa foi implementada na branch `feat/contexto-evento-operacional`.

Já coberto nesta entrega:

- Dashboard sem fallback para dados históricos;
- Vendas restritas ao Evento Operacional;
- Cortesias e métricas operacionais com contexto explícito;
- Remarketing restrito ao Evento Operacional;
- página pública rejeitando eventos encerrados;
- Check-in usando exclusivamente o Evento Operacional;
- cache offline do Check-in isolado por evento;
- sincronização offline preservando filas de outros eventos;
- bloqueio de edição/exclusão de eventos encerrados na interface;
- Links de Venda e Checklist também seguem o Evento Operacional e deixam de exibir/editar eventos encerrados;
- bloqueio no banco de alterações em eventos encerrados e seus lotes;
- teste da seleção do Evento Operacional.

### Proteções adicionais do Check-in

O cliente passou a chamar uma RPC específica por evento: `checkin_ticket_for_event`.

Essa função deve:

- aceitar somente evento pertencente à organização do operador;
- aceitar somente evento publicado e não encerrado;
- aceitar somente ticket pertencente ao `event_id` informado;
- impedir que um QR Code de evento encerrado ou de outro evento seja validado durante a operação corrente.

A migration `20260922235500_add_event_scoped_checkin.sql` foi aplicada no projeto Supabase correto do TicketFlow (`ywcdopjqfhisopipqxgq`) e a RPC `checkin_ticket_for_event(text, uuid)` foi verificada.

### Validação de produção

A aplicação do código desta branch passou pela validação automatizada. As migrations desta etapa foram aplicadas no projeto Supabase correto do TicketFlow (`ywcdopjqfhisopipqxgq`): `add_event_scoped_checkin`, `protect_closed_events`, `protect_closed_operational_children` e `harden_closed_batch_move`. As cinco triggers de proteção relevantes foram verificadas no banco.

Foi feita ainda uma auditoria adicional dos fluxos de Links de Venda e Checklist, que agora também respeitam exclusivamente o Evento Operacional.

A validação funcional ponta a ponta ainda deve ser feita após o merge/deploy.
