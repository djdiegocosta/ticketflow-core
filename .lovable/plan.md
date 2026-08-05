# Simulador de Evento (/admin/simulador)

Ferramenta de planejamento financeiro pré-evento: página única com scroll, 5 etapas numeradas e blocos de resultado que recalculam ao vivo. Tudo em memória (sem backend), pt-BR, light e dark.

## Estrutura da página

1. Cabeçalho "Simulador de Evento" no padrão de listagem (sem botão de ação).
2. Etapa 1 — Dados gerais: nome do evento (placeholder "Meu Evento") e capacidade total com texto de apoio.
3. Etapa 2 — Lotes: tabela com Lote (editável), Qtd. disponível, Preço, Qtd. vendida estimada, Receita (somente leitura) + remover por linha, "+ Adicionar lote" tracejado, linha de total, dropdown "Importar lotes de um evento" e nota sobre valor de face. Inicia com os 3 lotes especificados (100/R$80/100, 150/R$100/120, 150/R$115/80).
4. Etapa 3 — Outras receitas: 4 campos R$.
5. Etapa 4 — Custos fixos: 8 campos R$.
6. Etapa 5 — Custos variáveis por pessoa: 3 campos R$ + texto de apoio.
7. Resultado Financeiro: card hero escuro (mesmo no light) com resultado e badge lucro/prejuízo, 3 cards de apoio (Receita total, Custos totais, Margem %) e detalhamento em lista com linha final destacada.
8. Ponto de Equilíbrio: ingressos mínimos (custos fixos ÷ ticket médio, arredondado para cima) + % da capacidade, ticket médio líquido, barra de progresso com marcadores 0% / PE: X% / 100% preenchida até a ocupação atual.
9. Cenários de ocupação: 4 cards (Pessimista 50%, Realista 70%, Otimista 85%, Lotação total 100%) com ícones TrendingDown / Activity / TrendingUp / Rocket e borda superior de cor sutil.
10. Rodapé fixo de texto: "Esta ferramenta trabalha apenas com projeções — não usa nem altera dados reais de vendas."

## Cálculos (client-side, sem botão calcular)

- Receita de ingressos = Σ (preço × qtd. vendida)
- Receita total = ingressos + outras receitas
- Custos variáveis = Σ (custos por pessoa) × qtd. total vendida
- Custos totais = fixos + variáveis
- Resultado = receita total − custos totais; margem = resultado ÷ receita total
- Ticket médio = receita de ingressos ÷ qtd. total vendida (0 se sem vendas)
- Cenário: ticket médio × (capacidade × percentual)
- Campos vazios contam como 0; divisões por zero exibem 0 / “—”.

## Detalhes técnicos

- Nova página `src/pages/admin/SimuladorPage.tsx`; a rota existente `src/routes/admin.simulador.tsx` passa a renderizá-la (mantendo `beforeLoad` e `head` atuais, título/description ajustados).
- Um componente de seção numerada e um componente de campo monetário locais ao arquivo (ou em `src/components/admin/simulador/`) para evitar repetição.
- Reutiliza componentes compartilhados: `DataTable*`, `MiniMetricCard`/`MiniMetricGrid`, `filterFieldClass`, `formatCurrency` de `src/lib/sales-data.ts`.
- Importação de lotes usa os lotes mockados de `EVENTS` em `src/lib/sales-data.ts` (nome + preço), com qtd. disponível/vendida derivadas por padrão.
- Somente tokens CSS (sem cores hardcoded), cantos retos, sem alterar rotas, layout ou telas existentes.
