# TicketFlow — CHANGELOG

Registro cronológico de decisões, funcionalidades e ajustes do projeto. Mantido a cada prompt concluído.

---

## Julho/2026

### Fundação
- Definido stack: React + Vite + TypeScript, Tailwind + shadcn/ui, Supabase (a conectar), Lucide Icons.
- Criado Design System v1.0: paleta light/dark, tipografia Geist, espaçamento, componentes base.
- Estrutura de rotas completa definida (pública, cliente, admin, superadmin).
- Login de teste implementado (sem backend) para permitir navegação durante o desenvolvimento.

### Dashboard
- Cards de métricas: Receita Total, Ingressos Vendidos, Aguardando Pagamento (Gauge Chart), Visitas na Página.
- Seletor de contexto: Visão Geral / evento(s) ativo(s).
- Gráfico de vendas diárias (linha fina, suavizada) e pico de vendas por horário.
- Lista de últimas vendas em tempo real (mockado).
- Ajustes: Gauge Chart corrigido para formato meia-lua (não círculo completo); altura dos cards revisada.

### Eventos
- Listagem com filtros por status e paginação configurável.
- Criação em formato Wizard (Steps): Informações → Modelo de venda (lotes ou preço único) → Configuração → Revisão.
- Decisão de arquitetura: "preço único" é tratado internamente como um lote único ("Ingresso único") — sem caminho de código separado.
- Regras de virada de lote: automática por data/horário, automática por esgotamento de estoque, e "Virada Expressa" manual (com confirmação) na tela de detalhe do evento.
- Encerramento de evento: manual (comando do produtor), nunca automático por data. Não trava o Histórico Financeiro após encerrado.

### Vendas
- Listagem com abas de origem (TicketFlow / Manual / Importadas — Bilheteria removida desta área, ver Histórico Financeiro).
- Regra global: Comprador ≠ Participante — campos de nome de participante gerados dinamicamente conforme quantidade, em toda venda com mais de 1 ingresso.
- Lançamento manual convertido de modal centralizado para painel lateral (Sheet) com steps: Cliente → Ingressos → Confirmar.
- Geração de lista em PDF para check-in manual (ordem alfabética, checkbox, espaçamento compacto).
- Mini dashboard da área: Total vendido, Ingressos vendidos, Ticket médio, Aguardando pagamento.
- Botão renomeado de "Lançar venda manual" para "+ Nova Venda".

### Cortesias
- Simplificado deliberadamente em relação a Vendas: sem WhatsApp, sem distinção comprador/participante — apenas nome do convidado.
- Painel único de emissão com 3 formas de adicionar nome: digitar (Enter adiciona e mantém foco), colar lista, importar arquivo .txt — todas alimentando a mesma lista acumulada.
- Mini dashboard simplificado: Total de cortesias, Check-ins de cortesias.
- Geração de PDF no mesmo padrão de Vendas.
- Correção: tabela padronizada para seguir exatamente os parâmetros visuais de Vendas (fonte, badges, espaçamento).

### Clientes
- Listagem com colunas ordenáveis (indexáveis), incluindo por quantidade de ingressos — substitui a necessidade de um componente de ranking dedicado.
- Ranking "Top 10 Clientes" (dock lateral) especificado e depois removido/substituído pela ordenação de colunas.
- Adicionadas colunas: data de cadastro, botão de copiar WhatsApp; exclusão de cliente com confirmação.
- Botão "+ Novo Cliente" com painel lateral de etapa única (sem steps).
- Card "Novos Clientes" com seletor de período (7/15/30 dias).

### Padronização visual (transversal)
- Cantos retos definidos como padrão do sistema em todos os componentes (exceto elementos circulares funcionais: avatares, indicadores).
- Tipografia dos cards padronizada em todas as áreas.
- Sidebar e header do admin corrigidos para altura fixa (100vh), sem rolar junto com o conteúdo — só a área de conteúdo principal rola.
- Menu lateral reorganizado: Simulador de Evento, Remarketing e Sorteios agrupados em um hub único "Ferramentas" (grid de cards), reduzindo itens fixos do menu.
- Modal de Nova Venda e futuros modais complexos passam a usar o padrão de painel lateral (Sheet) com steps, ao invés de modal centralizado — reservado para fluxos com 2+ etapas ou muitos campos.

### Configurações
- Estrutura definida: Organização, Mercado Pago, Preferências, Backup de Dados — em telas separadas (menu lateral secundário, estilo macOS System Preferences).
- Assistente guiado de configuração do Mercado Pago (5 etapas): Ambiente → Aplicação MP → Credenciais → Webhook → Pagamento de teste. Baseado na versão validada do TicketFlow anterior, adaptado ao Design System atual.
- Credenciais armazenadas separadamente por ambiente (Sandbox / Produção).
- Etapas de Webhook e Pagamento de teste sinalizam claramente a dependência da conexão futura com Supabase — sem simular dados de infraestrutura inexistente.

---

## Setembro/2026

### Correção crítica — Geração de Pix no Checkout
- Bug: checkout público não coletava e-mail do comprador (campo `buyer_email` sempre enviado vazio). A API do Mercado Pago exige e-mail válido do pagador para gerar qualquer pagamento, incluindo Pix — a venda era criada normalmente, mas a geração do Pix falhava sempre depois, com o cliente vendo "Erro ao gerar o Pix" e a venda ficando pendente no sistema.
- Correção: adicionado campo obrigatório de e-mail no formulário de checkout (`CheckoutPage.tsx`), com validação de formato, e o valor real passa a ser enviado para `createPendingSale` e, por consequência, para a criação do pagamento Pix.
- Arquivo alterado: `src/pages/CheckoutPage.tsx`.

---

## Pendências conhecidas
- Conexão real com Supabase (schema, autenticação, Edge Functions) ainda não realizada neste projeto novo.
- Integração real com Mercado Pago depende da conexão com Supabase.
- ARQUITETURA.md será reescrito somente após a conexão real com o banco de dados (evitar documentação prematura que ficaria desatualizada).
