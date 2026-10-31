# TicketFlow Insights — decisões e definições

Painel BI **exclusivo para administradores** (colaborador, operador e cliente não acessam). Auditoria técnica feita em 29/10/2026.

## Decisões do dono (registradas)
1. **5º dia útil:** conta o sábado (regra do pagamento de salário). Implementar como **parâmetro** (pode virar "só segunda a sexta" sem refazer).
2. **Virada do mês:** os 3 últimos e os 3 primeiros dias do mês.
3. **Data da compra:** `paid_at` quando existir; senão `created_at`.
4. **Vendas manuais de bilheteria:** separadas por origem, não misturadas às online.
5. **Idade:** calculada na **data do evento**.
6. **Recorrente:** quem já comprou em um evento anterior.
- Sempre fora das análises: cortesias, vendas de teste, e tudo que não está `pago` (pendente, expirada, cancelada, reembolsada).
- Tudo no horário de Brasília (`America/Sao_Paulo`). Antecedência (D-n) por **data de calendário**, não por horário: venda na noite do evento é D0.
- A tela mostra sempre a cobertura (ex.: vendas sem cliente ligado ficam fora de idade, cidade, recorrência e ranking).

## Definições de rastreamento (Etapa 2)
- **Visualização:** carregamento da página pública do evento; o mesmo visitante recarregando em menos de 30 s conta uma vez.
- **Visitante único:** `visitor_id` distinto (identificador aleatório sorteado no navegador, guardado em `localStorage`, chave `tf_vid`). Visitas antigas (antes de 29/10/2026) não têm `visitor_id`: entram em "visualizações", não em "visitantes únicos".
- **Origem:** domínio de onde veio (`referrer_host`), `utm_source`/`utm_medium`/`utm_campaign` e o código `?ref=` do link de venda (`link_code`).
- **Não entram:** robôs, pré-visualizações de link, e a equipe (admin, colaborador, operador de check-in).
- **Teto:** 300 visitas por minuto por evento; só eventos publicados e abertos.
- **Não guardamos:** IP, impressão digital do aparelho, nome, e-mail ou qualquer dado pessoal.
- **Limitações:** navegador que bloqueia o armazenamento conta só como visualização; o navegador interno do Instagram pode guardar o identificador separado do Chrome (a mesma pessoa pode aparecer como 2 visitantes).
- Conversão só será confiável a partir da primeira venda com `visitor_id` (Etapa 6 liga o visitante à venda); o histórico anterior não permite esse cálculo.

## Etapas
1. Definições e limpeza de dados (marcar vendas de teste; data de abertura das vendas no evento).
2. **Rastreamento de visitantes** (este documento; migration `20261029190000_event_visit_tracking.sql`).
3. Fundação de dados: calendário de feriados, funções de estatística, índices, testes.
4. Insights v1 — vendas (indicadores 1 a 8), por evento e consolidado.
5. Público (indicadores 9 a 12).
6. Funil (13 e 14): ligar visitante à venda, conversão.
7. Acabamento: desempenho, celular, acessibilidade, documentação.

Testes: `tests/visitor-tracking.test.ts` (navegador) e `supabase/tests/event_visit_tracking.sql` (banco, termina em erro de propósito = tudo desfeito).
