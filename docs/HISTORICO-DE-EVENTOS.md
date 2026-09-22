# Histórico de Eventos

**Status:** 🟡 Etapa visual (protótipo de interface), rodada 2 — refinamento. Sem dados reais, sem persistência, sem regras de negócio.

---

## 1. Objetivo

Ferramenta para consultar os resultados e indicadores de eventos já encerrados: público, ingressos, receita, custos e resultado financeiro consolidado.

Fica dentro de **Admin → Ferramentas**, reaproveitando o card "Histórico de Eventos" que já existia ali (antes apontava, por engano, para o histórico de check-in — ver seção 6).

---

## 2. Onde fica

```
ADMIN
 └── FERRAMENTAS
       └── Histórico de Eventos   → /admin/ferramentas/historico-eventos
             └── Detalhe do evento → /admin/ferramentas/historico-eventos/:id
```

Nenhum item novo no menu lateral. Único ponto de entrada: o card já existente em Ferramentas, com a descrição "Consulte os resultados, indicadores e dados históricos dos eventos realizados."

---

## 3. Telas

### 3.1 Lista (`EventHistoryListPage`)
Busca por nome do evento, local ou cidade. Cada linha mostra: evento (com miniatura), data, local, público presente, ingressos, receita e resultado.

### 3.2 Detalhe (`EventHistoryDetailPage`)
**Uma única página, sem abas.** Cabeçalho simplificado (sem imagem do evento): "Voltar", nome do evento, selo "Encerrado em [data]" e data/local/cidade.

Os 4 KPIs do topo (Público, Ingressos, Receita, Resultado) usam o **mesmo componente dos cards do Dashboard** (`DashboardMetricCard`, extraído de `AdminDashboard.tsx` para `src/components/admin/DashboardMetricCard.tsx` — o Dashboard passou a importar esse componente em vez de definir o card localmente, sem mudança de comportamento). O KPI "Resultado" usa a cor de destaque (verde/erro) no ícone e no valor, igual ao restante do TicketFlow — sem criar um estilo novo.

Abaixo dos KPIs, seções empilhadas verticalmente, nesta ordem:
1. **Público**
2. **Vendas de ingressos**
3. **Bar**
4. **Financeiro**
5. **Indicadores**
6. **Observações do produtor**

Bar e Indicadores usam cards compactos (`Tile`), 2 por linha, evitando 6 números apertados numa linha só.

---

## 4. Público × ingressos × cortesias × presença real

São quatro números diferentes, sem confundir:

- **Ingressos antecipados** e **ingressos bilheteria** — pagos.
- **Cortesias** — emitidas, não pagas.
- **Público presente** — quem realmente compareceu. Será informado manualmente no encerramento do evento; nesta etapa é MOCK.

O percentual "antecipado × bilheteria" considera **apenas os ingressos pagos** (antecipados + bilheteria), sem incluir cortesias:

```
% antecipado = antecipados ÷ (antecipados + bilheteria)
```

---

## 5. Vendas por lote × bilheteria (dado manual)

A tabela de vendas por lote (colunas: **Lote | Qtd. | Valor | Receita**) mostra só os lotes vendidos pelo TicketFlow.

A **bilheteria não é um lote do TicketFlow** — é um dado que o produtor informa manualmente no encerramento (quantidade + receita). Por isso aparece separada, num bloco próprio, com a nota "Dado informado manualmente no encerramento".

---

## 6. Ajuste no card existente de Ferramentas

O card "Histórico de Eventos" em Ferramentas já existia, mas apontava para `/admin/historico` (o **registro de check-ins**, `CheckinHistoryPage`), não para resultados de evento. Para não perder essa funcionalidade:
1. O card existente passou a apontar para a nova ferramenta e teve a descrição revisada.
2. Um card **"Histórico de Check-in"** foi adicionado em Ferramentas, apontando para `/admin/historico`, preservando o acesso que já existia.

Nenhum card foi criado a mais para o Histórico de Eventos nem movido de posição.

---

## 7. Bar: venda, custo e resultado bruto

A receita do bar não é lucro. Custo dos produtos é um valor **informado manualmente** pelo produtor — nunca calculado como um percentual fixo (não existe regra "custo = 50% da venda").

```
Venda total do bar        R$ 10.000
Custo dos produtos          R$ 5.000
Resultado bruto              R$ 5.000  (= venda − custo)
Custo sobre venda                 50%  (= custo ÷ venda × 100, só um indicador)
```

Layout: 2 cards por linha (venda total / custo dos produtos, resultado bruto / custo sobre venda, público presente / consumo médio).

---

## 8. Financeiro simplificado

Sem detalhamento por categoria de custo (atrações, espaço, som, staff etc.). No encerramento, o produtor informa apenas dois números de custo:

```
RECEITAS
Receita de ingressos     R$ XX.XXX
Receita do bar           R$ XX.XXX
Receita total             R$ XX.XXX

CUSTOS
Custo do evento           R$ XX.XXX   (valor único, informado manualmente)
Custo do bar               R$ X.XXX   (idem)
Custos totais              R$ XX.XXX

RESULTADO
Resultado líquido          R$ X.XXX   (destaque com a cor temática do TicketFlow)
Margem                        XX,X%
```

---

## 9. Indicadores — definição de cada um

Cálculo de apresentação feito em tela a partir do mock (`deriveDisplayNumbers` em `EventHistoryDetailPage.tsx`). É a fórmula que a etapa de dados reais deverá seguir:

| Indicador | Fórmula |
|---|---|
| Ticket médio | receita de ingressos ÷ ingressos pagos |
| Receita por pessoa | receita total ÷ público presente |
| Consumo médio | receita do bar ÷ público presente |
| Venda antecipada | ingressos antecipados ÷ ingressos pagos |
| Cortesias | cortesias presentes ÷ público presente |
| Custo do bar | custo dos produtos do bar ÷ receita do bar |

Apresentados em cards compactos, 2 por linha — mesmo estilo da seção Bar.

**Observação sobre o mock:** por simplicidade, o mock assume que todas as cortesias emitidas compareceram (não existe ainda o campo "cortesias presentes" separado de "cortesias emitidas"). Isso deve ser revisto quando a lógica real for implementada.

---

## 10. O que é MOCK nesta etapa

- Toda a lista e o detalhe vêm de `src/lib/mocks/historico-eventos.mock.ts` — 4 eventos fictícios, isolados nesse arquivo, incluindo um caso de valores pequenos, médios e grandes (até R$ 1.245.800,00 de receita) para validar o layout dos KPIs com números grandes.
- Indicadores são aritmética de apresentação sobre os números mock, não uma regra de negócio validada.
- Observações do produtor: texto fixo de exemplo.

## 11. O que NÃO foi implementado nesta etapa

- Banco de dados, tabelas, migrations ou RPCs
- Formulário funcional de encerramento
- Integração com vendas, pagamentos, bar ou simulador
- Cálculo real dos indicadores a partir de dados de venda
- Campo separado de "cortesias presentes"

## 12. Dados que serão informados manualmente no encerramento (preparação conceitual)

Ainda sem tela funcional, mas a interface já foi pensada considerando que estes dados virão do formulário de encerramento (etapa futura):

- **Público:** ingressos vendidos na bilheteria, receita da bilheteria, cortesias, público presente
- **Bar:** venda total do bar, custo dos produtos do bar
- **Financeiro:** custo total do evento
- **Observações:** observações do produtor

Os demais dados (ingressos por lote, receita de ingressos, check-ins) devem vir automaticamente do TicketFlow.

## 13. Próximos passos previstos

1. Tela funcional de encerramento de evento (formulário para os dados manuais da seção 12).
2. Estrutura de banco para fechamento de evento.
3. RPC/lógica de fechamento que consolida vendas do TicketFlow + dados informados pelo produtor.
4. Trocar os mocks em `historico-eventos.mock.ts` por dados reais, mantendo os mesmos componentes de tela.
