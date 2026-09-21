# Histórico de Eventos

**Status:** 🟡 Etapa visual (protótipo de interface). Sem dados reais, sem persistência, sem regras de negócio.

---

## 1. Objetivo

Ferramenta para consultar os resultados e indicadores de eventos já encerrados: público, ingressos, receita, custos e resultado financeiro consolidado.

Fica dentro de **Admin → Ferramentas**, reaproveitando o card "Histórico de Eventos" que já existia ali (antes apontava, por engano, para o histórico de check-in — ver seção 5).

---

## 2. Onde fica

```
ADMIN
 └── FERRAMENTAS
       └── Histórico de Eventos   → /admin/ferramentas/historico-eventos
             └── Detalhe do evento → /admin/ferramentas/historico-eventos/:id
```

Nenhum item novo foi adicionado ao menu lateral do admin. O único ponto de entrada é o card já existente em Ferramentas.

---

## 3. Telas

### 3.1 Lista (`EventHistoryListPage`)
Busca por nome do evento, local ou cidade. Cada linha mostra: evento, data, local, público, ingressos, receita e resultado.

### 3.2 Detalhe (`EventHistoryDetailPage`)
Cabeçalho com evento, data, local, selo "Encerrado em [data]" e 4 cards (Público, Ingressos, Receita, Resultado).

Abas:
- **Resumo** — visão combinada de todas as seções (o padrão ao abrir a tela)
- **Público e Ingressos** — detalhamento de público + tabela de lotes
- **Vendas por Lote** — só a tabela de lotes, em destaque
- **Financeiro** — receitas, custos, resultado líquido e margem
- **Bar** — venda total, custo dos produtos, resultado bruto, público consumidor e consumo médio
- **Indicadores** — ticket médio, receita por pessoa, consumo médio, venda antecipada, cortesias

---

## 4. Dado novo: custo do bar

A receita do bar não é lucro — o custo dos produtos vendidos é informado separadamente e descontado:

```
Venda total do bar   R$ 10.000
Custo dos produtos   R$ 5.000
Resultado bruto      R$ 5.000  (= venda − custo)
```

**Importante:** nesta etapa o custo é só um valor mockado. Não existe regra de "custo = 50% da venda" implementada nem prevista — na etapa de dados reais, o produtor vai informar o valor gasto na compra dos produtos, e o sistema calcula o resultado bruto e o indicador "custo sobre venda" (custo ÷ venda × 100) a partir disso.

O custo do bar também aparece como uma das linhas de custo na aba Financeiro ("Custo dos produtos do bar"), separado dos demais custos operacionais (atrações, espaço, som/iluminação, segurança, staff, marketing, estrutura, outros).

---

## 5. Ajuste no card existente de Ferramentas

O card "Histórico de Eventos" em Ferramentas já existia, mas apontava para `/admin/historico` — que na verdade é o **registro de check-ins** (`CheckinHistoryPage`), não um histórico de resultados de evento.

Para não perder essa funcionalidade, foi feito:
1. O card existente "Histórico de Eventos" passou a apontar para a nova ferramenta (`/admin/ferramentas/historico-eventos`) e teve a descrição revisada.
2. Um novo card **"Histórico de Check-in"** foi adicionado em Ferramentas, apontando para `/admin/historico`, preservando o acesso ao registro de check-ins que já existia.

Nenhum outro card foi criado, movido ou removido.

---

## 6. O que é MOCK nesta etapa

- Toda a lista de eventos e os dados de detalhe vêm de `src/lib/mocks/historico-eventos.mock.ts` — 3 eventos fictícios, isolados nesse arquivo.
- Indicadores (ticket médio, receita por pessoa, consumo médio, resultado bruto do bar, margem etc.) são calculados em tela a partir dos números mock — é aritmética de apresentação, não uma regra de negócio ou cálculo validado contra vendas reais.
- Observações do produtor: texto fixo de exemplo.

## 7. O que NÃO foi implementado nesta etapa

- Banco de dados, tabelas, migrations ou RPCs para histórico de eventos
- Fechamento real de evento / formulário de encerramento
- Integração com vendas, pagamentos, bar ou simulador
- Cálculo real de indicadores a partir de dados de venda
- Edição ou lançamento de custos pelo produtor

## 8. Próximos passos previstos

1. Definir estrutura de banco para fechamento de evento (custos, receita do bar, custo do bar, observações).
2. RPC/lógica de fechamento que consolida vendas + custos informados pelo produtor.
3. Trocar os mocks em `historico-eventos.mock.ts` por dados reais, mantendo os mesmos componentes de tela.
