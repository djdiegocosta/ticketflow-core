## 11/11/2026 — Vendas: busca por nome corrigida

- 🐛 **Causa:** na busca de Admin → Vendas, o trecho do WhatsApp tirava os números do texto digitado. Ao digitar um nome (sem número), sobrava um texto vazio, e "qualquer coisa contém vazio" é sempre verdadeiro: toda venda passava no filtro. A busca por nome nunca estreitava a lista.
- ✨ Nova regra em `src/lib/sales-search.ts`: ignora maiúsculas e acentos ("joao" acha "João"); com várias palavras, todas precisam aparecer ("maria silva" acha "Maria da Silva"); WhatsApp só entra quando o texto parece telefone (com ou sem máscara, inteiro ou parcial); código da venda continua funcionando; venda sem WhatsApp não quebra a tela.
- A busca da tela Clientes já tinha a proteção correta (`digits.length > 0`) e não foi alterada.
- 🧪 10 testes novos (um deles reproduz o defeito antigo). Suíte inteira: 165 passam; typecheck limpo; `smoke:ssr` ok (9 páginas). Sem mudança no banco. Commit `8a34711`.

## 09/11/2026 — Insights: número do D0 e barras vazias

- 🐛 **Falha real corrigida:** no modo "Todas as vendas", a barra do D0 (dia do evento) podia ficar sem número ou com o total errado. A causa era minha: o número do topo da pilha usava a posição entregue pela biblioteca de gráficos, que só numera as barras não vazias. Agora o número vem de uma linha invisível no ponto do total de cada dia, sem depender de posição.
- ✨ **Barras vazias mostram "0"** em tom apagado. No modo padrão "Antecipadas", D0, "Pós-evento" e "Antes de D-N" são sempre zero por definição (D0 não entra em compras antecipadas), e antes ficavam em branco, o que parecia falha.
- Mapa de calor (números dentro dos quadrados) e Evolução diária (gráfico de área) não têm barras e não foram alterados.
- 🧪 Verificado em navegador simulado em 6 cenários (barra simples, pilha mista, D0 só, receita, média por evento, legenda e tooltip). Suíte inteira: 155 passam; typecheck limpo; `smoke:ssr` ok (9 páginas). Sem mudança no banco. Commit `9fec610`.

## 09/11/2026 — Insights: número no topo das barras e cantos arredondados

- ✨ Os gráficos de barras do Insights agora mostram **no topo de cada barra** o número da medida escolhida, como o gráfico "Picos de venda por horário" do Dashboard. O tooltip (passar o mouse) continua igual.
- 🔀 A medida padrão do painel passou de **Vendas** para **Ingressos**, para o número do topo ser o total de ingressos vendidos. Dá para trocar para Vendas ou Receita no filtro, e o número do topo acompanha a barra.
- 🎨 Barras com os cantos de cima arredondados (raio 6), no mesmo padrão do Dashboard. Na pilha "Outras datas + Dia do evento (D0)", só o segmento do topo arredonda e o número do topo é o total do dia (corrigido durante o teste: nos dias sem D0 o total não aparecia).
- Detalhes: zero não mostra número; receita em forma compacta ("1,2 mil") para caber em barras estreitas; "Média por evento" mostra a porcentagem. A evolução diária (gráfico de área) não tem barras e não foi alterada.
- 🧪 `formatBarLabel` com 4 testes novos; gráficos renderizados em navegador simulado nos 4 cenários (simples, receita, pilha com D0, média por evento). Suíte inteira: 155 passam; typecheck limpo; `smoke:ssr` ok (9 páginas). Sem mudança no banco. Commit `6fc886b`.

## 08/11/2026 — Meta Pixel: correspondência avançada manual

- 🐛 A Meta apontou "correspondência avançada manual não configurada" (Pixel 2269701520646682). O Pixel só era iniciado na abertura da página, sem nenhum dado do comprador.
- ✨ Novo `src/lib/meta-pixel.ts`: quando o comprador informa seus dados, o site reenvia `fbq('init', ID, {em, ph, fn, ln})` (e-mail, WhatsApp com DDI 55, primeiro nome e sobrenome, já normalizados; o Pixel faz o hash SHA-256 sozinho). Isso só atualiza os dados do usuário: não dispara PageView nem outro evento.
- 📍 Onde: checkout (ao continuar a etapa do comprador e ao finalizar a reserva) e confirmação (antes do evento `Purchase`; a confirmação não recebe e-mail, então o e-mail vem da mesma aba quando o comprador acabou de passar pelo checkout, só se for a mesma pessoa — mesmo WhatsApp).
- 🔒 Nunca lança erro nem trava o checkout; não grava dado pessoal em localStorage/sessionStorage/cookie; outra pessoa no mesmo aparelho substitui tudo, sem misturar dados. Nenhuma mudança no banco, na página de confirmação pública ou nas variáveis de ambiente.
- 🧪 12 testes novos. Suíte inteira: 151 passam; typecheck limpo; `smoke:ssr` ok (9 páginas). Commit `2e45dfc`.
- ⚠️ A política de privacidade não cita o Pixel/Meta (ver AUDITORIA-STATUS).

## 07/11/2026 — Ferramentas: excluir sorteios pelo histórico

- ✨ Adicionado botão de exclusão em cada item do histórico do Sorteador, com confirmação explícita antes de apagar.
- 🗄️ Nova RPC `delete_raffle`: valida administrador e organização e remove, em uma única operação, ganhadores, prêmios, participantes e sorteio. Sem alterações em vendas, ingressos ou check-ins.
- 🔒 Execução bloqueada para `anon`; as tabelas continuam sem acesso direto pelo navegador.
- 🧪 Teste transacional com sorteio que já tinha ganhador: os quatro conjuntos de registros foram removidos; rollback deixou zero dados de teste. `anon` não pode executar a RPC. CI em execução.
## 07/11/2026 — Ferramentas: Sorteador (PUBLICADO)

- ✨ Nova ferramenta em **Admin → Ferramentas → Sorteador**: cinco critérios de público, período opcional, modo avançado por pessoa/ingresso, prêmios adicionados dinamicamente, histórico, nomes embaralhando por 5 segundos, apresentação 9:16 e exportação PNG 1080×1920.
- 🗄️ Reaproveita as estruturas originais `raffles`, `raffle_participants` e `raffle_winners`; adiciona `raffle_prizes` para múltiplas rodadas. As tabelas legadas estavam vazias antes da conversão. Participantes ficam congelados no momento da criação; ganhadores são sorteados no servidor e não se repetem.
- 🔎 Compradores: somente vendas pagas, sem cortesia, teste ou reembolso integral; inclui compras sem cadastro. Quando existe `customer_id`, ele identifica a pessoa; sem vínculo, usa a combinação exata de nome e WhatsApp, sem agrupar apenas pelo telefone. Recorrência exige vínculo confirmado (`customer_id`) e compras em eventos distintos. Por ingresso, cada ticket gera uma chance e usa o nome do participante no ingresso.
- 🎟️ Check-in: somente tickets utilizados, com `checked_in_at`, no evento operacional. A identidade por pessoa usa o nome normalizado do participante, pois a estrutura de check-in não tem um identificador pessoal próprio além do ingresso.
- 🔒 RPCs validam administrador e organização; privilégios diretos nas tabelas foram revogados para `anon` e `authenticated`. As quatro tabelas têm RLS ativo e não aceitam leitura direta por esses papéis. Não altera vendas, pagamentos, tickets, check-in ou XP.
- 🧪 Testes transacionais no banco: clientes cadastrados com duas rodadas e sem repetição; compradores do evento por pessoa e ingresso; compradores no período; recorrentes; check-in vazio recusado (evento futuro). Rollback confirmado, sem registros de teste residuais.
- ✅ PR #57 integrado à `main` no commit `9e633334`; CI do push à main passou (typecheck, testes, build e smoke SSR). Vercel production deployment `dpl_3fa1B7qsiqP7YPbHDBEGLq4ynBvi` READY e associado a `ticketflow-core.vercel.app`. Nenhum erro de runtime encontrado no intervalo verificado.

## 07/11/2026 — Dashboard: gráfico "Picos de venda por horário" com números cortados

- 🐛 No gráfico do `/admin` (Dashboard), os números do eixo esquerdo apareciam cortados e o número em cima da barra mais alta ficava escondido. Causa: margem esquerda negativa (`-20`) maior que o espaço do eixo, e pouca folga no topo. Corrigido: margem esquerda `0` e topo `24`. Só visual, sem mudar dados; o gráfico "Vendas diárias" não foi alterado.
- 🧪 `typecheck` limpo; suíte inteira: 139 passam; `smoke:ssr` ok (8 páginas). Banco não alterado. Commit `dc22f09`.

## 06/11/2026 — Clientes (admin): ordenação da coluna "Cliente" alterna nome e data de cadastro

- ✨ Em `/admin/clientes`, clicar em "Cliente" ordena de A a Z; no segundo clique ordena pela data de cadastro, dos mais recentes para os mais antigos (aparece "· cadastro" ao lado do título); no terceiro volta para A a Z. As outras colunas continuam alternando crescente/decrescente como antes.
- 🧪 Só a tela mudou (a data de cadastro já vinha carregada); banco não alterado. `typecheck` limpo; suíte inteira: 139 passam; `smoke:ssr` ok (8 páginas). Commit `6a62fe4`.

## 04/11/2026 — Vendas: indicador de cliente com conta / sem conta

- ✨ Na listagem de vendas (`/admin/vendas`), à frente do nome do cliente, aparece uma bolinha: **verde** = o cliente tem conta (login) no TicketFlow; **laranja** = comprou sem criar conta. Passar o mouse mostra a explicação em texto, e o leitor de tela também lê (a cor sozinha não é a única informação). Cores via `--success` e `--warning`, que não mudam com o tema de cor da organização.
- 🔎 Regra: conta existe quando a venda está ligada a um cliente (`sales.customer_id`) cujo `customers.user_id` está preenchido. Dados reais na hora da implementação: 82 vendas com conta, 1 ligada a cliente sem login, 35 sem ligação nenhuma.
- ⚠️ **Colaborador não vê a bolinha** de propósito: a regra de acesso do banco só deixa o admin ler a tabela `customers`. Para o colaborador todas ficariam laranja (informação falsa). Para liberar seria preciso mudar o banco (decisão do dono).
- 🗄️ **Dados corrigidos no banco (1 venda):** a venda paga em 04/11 de uma cliente com conta estava sem vínculo porque o e-mail digitado na compra tinha erro (`gmal.com`). WhatsApp e nome exatamente iguais aos da conta → vinculada a ela (`sales.customer_id`). Efeito esperado: o banco recalculou o XP automaticamente (gatilho `trg_xp_resync_sale_update`). Reversível: voltar `customer_id` para vazio nessa venda. Depois disso: 83 vendas com conta, 35 sem.
- 🗄️ **Mais 2 vendas vinculadas no banco, a pedido do dono (05/11):** (1) venda de 19/09 ligada à conta cujo WhatsApp e nome (versão curta) conferem — o e-mail da venda era de outra pessoa, ignorado; (2) venda de 20/09 ligada à conta com mesmo e-mail e WhatsApp (nome da venda diferente, provável compra para um amigo). O XP foi recalculado pelo gatilho. Total: 85 com conta, 32 sem. Reversível voltando `customer_id` para vazio.
- ⏸️ E-mail da venda de 04/11 (`gmal.com`) **não foi corrigido**: difere do e-mail da conta também na parte antes do `@`, então não dá para provar que é só erro de digitação. Aguarda confirmação do dono.
- 📌 Pendência: 1 venda sem ligação (11/10) só cruza com uma conta pelo e-mail, com nome e WhatsApp diferentes — decidido não vincular. A função `link_guest_purchases_to_current_customer` (liga por e-mail ao logar) existe no banco, mas nenhum ponto do app a chama hoje.
- 🧪 `typecheck` limpo; suíte inteira: 139 passam; `smoke:ssr` ok (8 páginas). Banco não alterado (só leitura). Commit `b0ed1b5`.

## 04/11/2026 — Simulador de Evento: importação de lotes agora usa os eventos reais

- 🐛 O botão "Importar lotes de um evento" listava 3 eventos de exemplo fixos no código ("Festa de Verão", "Show do Ano", "Festival Outono") — dados da época do desenvolvimento. Agora lista os eventos reais da organização.
- ✨ Ao escolher um evento, importa o nome do evento e o nome e preço dos **lotes pagos**. O lote de cortesia fica de fora e as vendas estimadas começam em zero (o simulador continua sem usar vendas reais). Evento sem lote pago: nada é substituído e aparece um aviso. Se a busca falhar, aparece mensagem de erro. Trocar de evento rapidamente não mistura os lotes.
- 🧪 Regra em `lotsFromBatches` (`src/lib/simulador-calc.ts`) com 5 testes novos. Suíte inteira: 139 passam; typecheck limpo; `smoke:ssr` ok (8 páginas). TPS 8.10 atualizado.
- 🗄️ Banco não alterado (só leitura de eventos e lotes). Commit `b961645`.
- 📌 Pendência: `src/lib/sales-data.ts` (eventos e vendas de exemplo, sem nenhum uso) e `src/lib/public-data.tsx` (provedor de vendas de exemplo ligado no `__root.tsx`, sem nenhuma tela que o use) são resquícios de dados fictícios. Remoção aguarda decisão do dono.

## 04/11/2026 — Simulador de Evento: ajustes de estrutura e bar automático

- ✨ **Cortesias** passam para a Etapa 2, junto dos lotes (valem com ou sem bar). Novo indicador **Público total estimado** = ingressos vendidos + cortesias.
- ✂️ Lotes: removido o campo "Qtd. disponível" (e a soma dele no total).
- ✨ **Bar:** o custo total dos produtos deixou de ser digitado e virou card automático = receita bruta do bar × (100% − margem bruta esperada), com receita = público total × consumo médio. Margem limitada a 0–100% (nunca gera custo negativo). A margem esperada agora é salva e recarregada com a simulação (antes se perdia). A comparação "esperada vs. real" foi removida: com o custo vindo da margem, as duas seriam sempre iguais.
- ✂️ Removidos o campo **Decoração** (custos fixos) e toda a etapa **Custos variáveis** (inclusive a linha no detalhamento do resultado).
- 🔀 **Outras receitas** passou a ser a última etapa de preenchimento (Etapa 5), antes do Resultado Financeiro. Ordem final: Dados gerais → Lotes e cortesias → Bar → Custos fixos → Outras receitas.
- 🧪 Cálculo do bar isolado em `src/lib/simulador-calc.ts` + `tests/simulador-calc.test.ts` (6 testes). Suíte inteira: 134 passam; typecheck limpo; `smoke:ssr` ok (8 páginas). TPS 8.10 atualizado.
- 🗄️ Banco **não alterado** (a tabela `simulations` guarda JSON livre; estava vazia — 0 simulações salvas — então nenhuma simulação antiga é afetada). Commit `24acf19`.

## 31/10/2026 — Insights, Etapas 3+4: fundação de dados e primeiro painel (APLICADA)

- ✨ **Migration `20261031150000` aplicada no banco em 31/10/2026 (autorizada pelo dono)** e código publicado na main: nova página **`/admin/insights`** (exclusiva para administrador; colaborador e demais papéis são redirecionados; as funções do banco também recusam quem não é admin) com os indicadores 1 a 8: vendas por dia da semana, faixa de horário (4 h), período do mês, antes/depois do 5º dia útil, virada do mês, antecedência D-20 a D0 (janela de 20, 30, 45 ou 60 dias), evolução diária (por dia ou acumulada) e cruzamento antecedência x dia da semana x período do mês. Filtros: evento ou consolidado, período (tudo, 30 dias, 90 dias, datas), origem (online, bilheteria, todas), medida (vendas, ingressos, receita) e sábado como dia útil.
- 🗄️ Banco: tabela `br_holidays` (feriados nacionais 2026-2030), `br_is_business_day`, `br_nth_business_day`, funções `insights_sales_facts/breakdown/daily/cross/summary` (SECURITY INVOKER, exigem admin, sem dado pessoal) e dois índices por data em vendas pagas.
- 📏 Regras: venda = paga, sem cortesia e sem teste; data da compra = pagamento, senão criação; receita desconta reembolso parcial; tudo no horário de Brasília; antecedência por dia de calendário (venda na noite do evento = D0); 5º dia útil contando sábado (parâmetro).
- 🧪 `supabase/tests/insights_foundation.sql` (26 verificações no banco real, em simulação desfeita, antes e depois de aplicar: 26 PASS / 0 FAIL, com resultados esperados contados à mão, limites de fuso e de feriado e segurança pelo papel `authenticated`) e `tests/insights-format.test.ts` (12). Suíte inteira: 128 testes passam; typecheck limpo; build ok.
- ⚠️ A tela ainda não foi vista renderizada num navegador (sem acesso durante o desenvolvimento): conferir visual e celular. Item de menu próprio "Insights" (logo após Dashboard), decisão do dono.

## 31/10/2026 — Insights, Etapa 1: vendas de teste e abertura das vendas (APLICADA)

- ✨ **Migration `20261031120000` aplicada no banco em 31/10/2026 (autorizada pelo dono)** e código publicado na main: `sales.is_test` marca vendas de teste (hoje só `TEST1D58EE2D`; o assistente de teste do Mercado Pago, `create_mp_test_sale`, passa a marcar sozinho); `events.sales_open_at` guarda a abertura real das vendas; `event_sales_open_at()` devolve a abertura efetiva (valor gravado, senão início do 1º lote de venda, senão criação do evento).
- 📌 Dados históricos: e-o-beat = momento da criação do evento (08/09/2026 17:37, confirmado pelo dono: as vendas abriram ao criar o evento; as datas dos lotes foram regravadas depois); modo-revoada e halloween = início do 1º lote de venda.
- 🔒 Evento encerrado continua imutável (`trg_prevent_closed_event_update`), exceto a abertura das vendas, que é dado de análise e foi posta fora do bloqueio (testado: título continua bloqueado, abertura aceita correção).
- ✨ Formulários de criar e editar evento ganham "Abertura das vendas" (horário de Brasília). Vem sugerida pelo início do 1º lote e **não muda sozinha** ao editar um lote. Helper `src/lib/sales-open.ts`.
- 🧪 `tests/sales-open.test.ts` (5) e `supabase/tests/insights_data_foundations.sql` (16 verificações no banco real, em simulação desfeita, antes e depois de aplicar: 16 PASS / 0 FAIL).
- ✅ XP **não** alterado, por decisão do dono: o bônus de "primeiro dia" continua usando a data dos lotes (alinhar à nova abertura mudaria o e-o-beat: 5 clientes perdem +50 e 1 ganha +50, saldo líquido −200 XP).

## 31/10/2026 — Insights, Etapa 2: rastreamento de visitantes (APLICADA)

- ✨ **Migration `20261029190000` aplicada no banco em 31/10/2026 (autorizada pelo dono)** e código publicado na main: a página pública do evento passa a registrar um identificador anônimo do visitante (`visitor_id`), o site de origem, `utm_*` e o código `?ref=`. Nova função `track_event_visit(...)`; `track_event_view(uuid)` continua e usa a mesma validação. Definições em `docs/INSIGHTS-PLANEJAMENTO.md`.
- 🔒 `track_event_view` aceitava qualquer chamada anônima, até para evento inexistente ou rascunho. Agora só grava evento publicado e aberto, ignora repetição do mesmo visitante em 30 s e tem teto de 300 visitas/minuto por evento.
- 🔒 `anon` e `authenticated` tinham todos os privilégios (até `TRUNCATE`) em `event_page_views`; só a regra de linhas segurava. Revogados; leitura segue só para administrador.
- 🧪 `tests/visitor-tracking.test.ts` (16 testes, passam; a suíte inteira, 111, passa com o `bun`) e `supabase/tests/event_visit_tracking.sql` (13 verificações no banco real, em simulação desfeita: 13 PASS / 0 FAIL). Executado de novo no banco real depois de aplicar: 13 PASS / 0 FAIL, nada gravado. Histórico preservado (visitas antigas sem `visitor_id` iguais antes e depois).
- Não conta: robôs, pré-visualização de link e equipe interna (admin/colaborador/operador). Política de Privacidade atualizada (seção 2) com a coleta anônima de visitas.

## 28/10/2026 — Dados: 9 compras sem conta ligadas ao cadastro (opção C)

- 🧾 **Ligação manual, conferida caso a caso, de 9 vendas pagas feitas sem login ao cadastro do
  mesmo cliente** (`sales.customer_id` estava vazio). Critério: nome igual ao do cadastro **e**
  WhatsApp ou e-mail igual, sem nenhum outro cadastro candidato. Vendas: `E86F8D25`
  (Thais Ribeiro), `4BB095E0` (Kayck Bonifácio da Silva), `22F0D2B0` (Ingrid Defante),
  `27B2CB75` (Izabela de Souza Faria), `47B017EE` (Andressa Freitas Rocha), `B4924B1E` e
  `82AF44A7` (Karolayne Rosa Alvarenga de Oliveira), `58BDB2BB` (Kauê de Barcellos Lopes),
  `D50C1040` (Kaik Aguiar). Cada venda ficou com uma anotação em `observation`. Aprovado pelo
  produtor em 28/10/2026 depois de simulação desfeita no banco.
- **Efeito medido:** recorrência 57 compradores / 6 recorrentes (10,5%) → **61 / 9 (14,8%)**;
  vendas pagas sem vínculo 43 → 34. **Efeito colateral esperado:** o XP é calculado a partir das
  vendas (`trg_xp_resync` → `rebuild_customer_xp`), então 5 clientes ganharam pontos retroativos
  (Kayck +300, Karolayne +500, Izabela +200, Andressa +300, Kauê +250); ninguém fora da lista mudou
  e o livro-razão de XP ficou sem divergências.
- **Ficaram de fora de propósito (não ligar sem confirmação):** `64EF9102` (WhatsApp de uma conta,
  e-mail de outra), `A9A1BB04` (contatos de outra pessoa) e `5EA9A2FC` (e-mail de outra pessoa; ligar
  tornaria a Isadora "recorrente" por engano).
- **Para desfazer** (os pontos se recalculam sozinhos):
  `update public.sales set customer_id = null where sale_code in ('E86F8D25','4BB095E0','22F0D2B0','27B2CB75','47B017EE','B4924B1E','82AF44A7','58BDB2BB','D50C1040');`

## 29/10/2026 — XP: cliente com login sem perfil passa a ganhar XP (APLICADA no banco)

- 🐛 **1 cliente tinha login (`auth.users`) mas nenhuma linha em `profiles`**, então não recebia nenhum XP. Migration `20261029120000_xp_signup_date_fallback.sql` (aplicada, autorizada pelo dono): a data de cadastro passa a ser `profiles.created_at` e, se o perfil faltar, `auth.users.created_at` (as duas datas coincidem nos outros 132 clientes). Efeito real: +1 linha (conta +50, 08/09/2026); nada mudou nas linhas existentes. Todas as contas agora têm XP (132 de 132).
- 🔒 `xp_expected_ledger()` e `rebuild_customer_xp()` agora só rodam pelo dono (editor SQL do Supabase) e pelos gatilhos; `service_role` perdeu o acesso (a função lê `auth.users`, que `service_role` não pode ler) e nenhum papel da API as executa.
- 🧪 `supabase/tests/xp_signup_fallback.sql` executado no banco real, desfeito: PASS (compra anterior ao cadastro não conta; conta 50 + compra 200 + 1ª compra 50 + 1º comprador 100 = 400).
- 📊 Estado do ledger em 29/10: 272 linhas, 21.200 XP, 132 clientes com XP. Os ~1.550 XP acima do previsto na v3 vêm de **9 vendas antigas ligadas manualmente a cadastros em 29/10 às 14:28** (observação "Ligada manualmente ao cadastro de ..."): ao receberem `customer_id`, o gatilho reconheceu as compras feitas depois do cadastro. Confirma que o caminho ao vivo funciona.

## 28/10/2026 — XP v3: regras centralizadas, testes e correção de segurança (APLICADA no banco)

- ✨ **Migration `20261028230000` aplicada no banco de produção em 28/10/2026 (autorizada pelo dono):** `xp_expected_ledger()` e `rebuild_customer_xp()` viram a única fonte das regras; gatilhos antigos `grant_xp_*` substituídos por um gatilho único; recálculo idempotente (2ª execução = 0/0/0). Documentação em `docs/XP-REGRAS.md`.
- 🐛 Achados na auditoria da v2: (1) vendas lançadas já como "pago" (venda manual) não geravam XP ao vivo, só no recálculo; (2) venda paga cancelada/reembolsada mantinha o XP; (3) lote de cortesia contava como abertura das vendas no bônus do primeiro dia; (4) a ordem do "primeiro comprador" usava `updated_at`, que muda com edições posteriores; (5) não havia função de recálculo reexecutável nem testes.
- 🔒 **Segurança:** qualquer cliente logado conseguia ler o XP de todos (a policy usava `get_user_organization`, que sempre devolve a única organização). Corrigido na v3: só o próprio cliente ou admin/colaborador; escrita direta revogada de `anon`/`authenticated`.
- 🧹 Patentes (Novato/Frequente/VIP/Elite/Lenda) removidas da view `customer_xp_totals`; a interface já não as usava.
- 🧪 `supabase/tests/xp_rules_v3.sql`: 37 verificações (14 cenários do pedido + segurança). Executado contra o banco real, dentro de transação desfeita, antes e depois de aplicar: 37 PASS / 0 FAIL, nada gravado. Ver `docs/XP-REGRAS.md` para como rodar.
- 📊 Resultado confirmado no banco após aplicar (previsto = real): 254 → 258 linhas, 19.400 → 19.600 XP; 6 clientes mudam de saldo (5 bônus de primeiro dia passam a valer, 1 deixa de valer, 1 bônus de primeiro comprador muda de dono no e-o-beat). Caio Luiz da Silva Santos: 750 → 800. Cópia do ledger anterior em `customer_xp_events_snapshot_v2` (254 linhas, 19.400 XP); histórico da v1 em `customer_xp_events_archive` (342 linhas, 34.000 XP). Fidelidade: aprovada a regra "+200 a cada 3 eventos seguidos".

## 28/10/2026 — Clientes recorrentes: fórmula testada, cobertura visível

- 🐛 **Clientes recorrentes (revisão do que o commit `b291bfc` já corrigiu):** o código
  de `main` já contava eventos distintos (antes era "compras > 1", que incluía quem
  comprou várias vezes no mesmo evento). Esta rodada não mudou o resultado, só tornou o
  cálculo confiável e auditável: (1) lógica extraída para `src/lib/recurrence.ts`
  (função pura, fórmula documentada no topo do arquivo e em `PROJECT-MAP.md`);
  (2) 14 testes, incluindo uma réplica da distribuição real conferida por SQL
  (57 compradores identificados / 6 recorrentes = 10,5%; É O BEAT 6/41 = 14,6%;
  Modo Revoada 5/16 = 31,3%; Halloween 1/6 = 16,7%) e o caso do problema original;
  (3) leitura paginada das vendas agora com `ORDER BY id`: sem isso `.range()` pode
  repetir ou pular linhas entre páginas conforme a base crescer; (4) dica (ao parar
  o mouse em "Clientes recorrentes") com a fórmula e a cobertura real
  ("X% das vendas pagas, N de M"). Layout e demais métricas inalterados.
## 28/10/2026 — XP: regras v2, recálculo e preservação do histórico

- 🔒 Aplicada no Supabase a migration `refactor_customer_xp_rules_v2`: 342 registros antigos preservados em `customer_xp_events_archive`; ledger ativo reconstruído com as regras oficiais, sem somar saldos antigos.
- ✨ XP atualizado: cadastro +50; compra paga +200 por transação; primeira compra +50; check-in válido +50 por cliente/evento; primeiro comprador +100; primeiro dia +50; compra adicional no mesmo evento +50; compra de 3+ ingressos +100; fidelidade de 3 eventos consecutivos concluídos +200.
- 🔒 Vendas sem conta e atividades anteriores ao cadastro não entram no recálculo. Chaves idempotentes impedem duplicação de concessões.
- 🐛 A tela de pontos foi simplificada para remover patentes; ajuste de frontend e migrations estão na branch `fix/xp-rules-recalculation-20261028`, aguardando CI/revisão antes do deploy.
- 🧪 Validação pós-migration: 254 registros ativos, 19.400 XP somados; 0 vendas de convidado com XP e 0 chaves de origem duplicadas. O caso Caio Luiz da Silva Santos foi recalculado para 750 XP.
- ⚠️ A auditoria do Supabase encontrou outros avisos preexistentes de funções SECURITY DEFINER; não foram alterados nesta tarefa. A tabela de arquivo teve RLS ativado e acesso API revogado.

## 27/10/2026 — Checkout: resumo do pedido correto com mais de um lote

- 🐛 **Resumo do pedido na tela de pagamento não depende mais da lista de lotes à
  venda.** Com dois lotes ativos, a revisão da correção dos lotes achou dois erros
  de exibição (o valor do Pix sempre veio do servidor e estava certo): (1) ao
  retomar um pagamento (`?resume=`, "Meus ingressos → pagar agora") o resumo caía no
  primeiro lote e na quantidade 1 — quem retomasse 2 ingressos do Lote Especial via
  "1x 1º Lote R$ 25,00" em vez de "2x Lote Especial + COPO R$ 70,00"; (2) se o lote
  saísse da lista durante o pagamento (último ingresso levado pelo próprio cliente,
  ou fim do prazo do lote, comum ao voltar do app do banco), o resumo mostrava
  "R$ 0,00". Agora o resumo vem da reserva (nome do lote, quantidade e total
  gravados pelo servidor). Lógica em `src/lib/order-summary.ts` (6 testes; um deles
  pegou um erro meu: `Number(null)` vale 0 e viraria "R$ 0,00").
- 🧪 **Teste de regressão do banco publicado:**
  `supabase/tests/get_available_batches_lotes_simultaneos.sql` (listagem de lotes
  simultâneos + checkout como visitante; termina de propósito com erro, o que desfaz
  tudo — leia o texto do erro). Rodado contra a função real em 24/10: 14 cenários ok.

## 27/10/2026 — Coluna XP na lista de clientes (admin)

- ✨ **Admin → Clientes: nova coluna "XP"** (depois de "Total Gasto"), com o total de pontos de cada cliente e ordenação clicável. Os valores vêm da view `customer_xp_totals` (uma linha por cliente, a mesma fonte da tela Pontos do cliente), lida em uma única consulta junto com o carregamento da lista. Se essa consulta falhar, a lista continua funcionando e o XP aparece como 0. Sem mudança no banco, nas políticas RLS ou nas dependências. (`3a1fec4`)
- 🐛 **Grid da lista de clientes desajustado após a coluna nova:** nomes longos passavam para uma segunda linha e, depois, ficavam largos demais. Agora o nome é cortado com "…" a partir de 20 caracteres e a cidade a partir de 16 (texto completo ao passar o mouse). Removida a largura mínima forçada da tabela (`min-w-[980px]`) e cabeçalhos em linha única, para não aparecer barra de rolagem horizontal em telas de computador. Cabeçalhos renomeados: "Pontos XP" → "XP" e "Ingressos/Eventos" → "Ingressos"; a coluna Ingressos mostra só a quantidade de ingressos (o total de eventos continua em "Eventos participados", na ficha do cliente).

## 23/10/2026 — Lotes simultâneos na página pública

- 🐛 **Lotes: com dois lotes ativos ao mesmo tempo, só um aparecia para o cliente.** A função `get_available_batches` liberava os lotes em fila (o lote N só aparecia quando os anteriores esgotavam ou venciam). Caso real: no `halloween-fantasy-2026`, "1º Lote" (R$ 25) estava escondido e só o "Lote Especial + COPO" (R$ 35) aparecia. Nova migration `20261023190000_get_available_batches_all_active.sql`: aparece todo lote de venda dentro do período (`starts_at`/`ends_at`) e com estoque; cortesia segue fora; mesma assinatura e mesmos grants. Ordem: início do lote e, em empate, o mais barato primeiro. Testado em simulação com rollback: lista com 2 lotes ativos, checkout de cada um com preço e baixa de estoque corretos, e recusa de cortesia, lote futuro, vencido, esgotado e estoque excedido.
- 🔒 **Checkout:** o servidor (`create_pending_sale`) já validava o lote escolhido; não foi alterado. Na tela, se o lote escolhido sai de venda antes do pagamento, aparece "Este ingresso não está mais disponível" em vez de trocar em silêncio para outro lote com outro preço. A tela do evento passa a destacar e enviar sempre o lote realmente exibido como selecionado.
- 📝 `docs/TPS.md` atualizado: a regra em fila foi substituída por "todos os lotes ativos aparecem juntos".

## 23/10/2026 — Correções da área Clientes

- 🐛 **Clientes:** corrigida a ordenação por quantidade de ingressos; histórico ordenado pela data real da venda; status expirado identificado como “Expirado” e estados desconhecidos não são classificados como pendentes.
- ⚡ **Desempenho:** métricas agregadas por cliente em uma passagem, evitando filtrar e ordenar o histórico repetidamente.
- 🔒 Nenhuma alteração em banco, políticas RLS ou dependências nesta mudança. A auditoria de segurança do Supabase permanece uma verificação separada.

## 23/10/2026 — Correção em preparação

- 🐛 **Estatísticas do dashboard:** o retorno usado quando nenhum evento está selecionado agora inclui `expiredSales: 0`, mantendo o formato consistente com a consulta normal. Correção de tipagem preexistente na `main`; commit de código `19ada41`. Aguardando validações automatizadas e revisão.

## 23/10/2026 — Indicador operacional de pagamentos (em PR)

- ✨ **Dashboard — Pendentes:** removido o medidor percentual; o card mantém quantidade e valor aguardando pagamento e passa a mostrar também o total de vendas expiradas no evento/escopo atual. Reutiliza os status existentes, sem migration; alerta de falhas recentes de Pix já existente permanece. Código: `4d92ccd`. Validações automatizadas ainda pendentes.

## 23/10/2026 — Principais cidades dos compradores (em PR)

- 🎨 **Dashboard — Dados do público:** lista compacta das três cidades mais frequentes entre compradores com venda paga, com contagem e percentual entre compradores com cidade preenchida; normaliza espaços e diferenças de caixa. Cidade é a informada no cadastro, não geolocalização. Código inicial `7eec21b`; validações automatizadas ainda pendentes.

## 23/10/2026 — Correção da métrica de visualizações
- 🐛 **Dashboard — Dados do público:** rótulo corrigido para “Visualizações da página”, pois `track_event_view` grava uma linha por carregamento e não identifica visitantes únicos. Sem alterações de layout ou banco nesta correção.

## 23/10/2026 — Dados demográficos mais representativos (em PR)

- 🎨 **Dashboard — Dados do público:** substitui extremos mínimo–máximo por faixas etárias, exibe cobertura de data de nascimento e inclui “Não informado” na distribuição de sexo; percentuais usam a base de compradores identificados do escopo. Testes automatizados ainda pendentes.

# TicketFlow — CHANGELOG

Registro cronológico de mudanças reais no projeto. **Mais recente no topo.**

**Reiniciado em 01/10/2026.** O changelog anterior parou de ser atualizado em
julho/2026 — mais de 460 commits depois ficaram sem registro, por agentes
diferentes trabalhando sem anotar. Reconstruir esse histórico perdido viraria
arqueologia de git, então não tentamos: o conteúdo antigo continua disponível
em `docs/CHANGELOG-ARQUIVO-ATE-2026-07.md`, e o histórico completo sempre
pode ser consultado em `git log`. **Daqui pra frente, toda mudança relevante
entra aqui — ver regra em `CLAUDE.md`.**

**Como registrar uma entrada nova:** data, categoria (🐛 correção /
🔒 segurança / ✨ funcionalidade / 🎨 design / 📝 documentação), descrição
em 1 linha, hash do commit entre parênteses. Adicionar sempre no topo.

---

## 23/10/2026 — Correção publicada

- 🐛 **Clientes recorrentes no dashboard:** o indicador considera compras pagas e não cortesia em eventos distintos da mesma organização, usando somente clientes identificados. Exibe também a taxa entre compradores identificados do escopo atual. Vendas sem vínculo com cliente ficam fora da taxa; correção integrada no commit `b291bfc`. Typecheck, testes automatizados, build, smoke test SSR e publicação na Vercel concluídos com sucesso.

## 16/10/2026 — Agente Claude (chat)

- ✨ **"Data de cadastro" em "Dados do cliente"** (`ClientDetailPage`). Mostra
  quando o cliente criou a conta (`account_created_at`); se essa data não foi
  gravada, usa a do registro (`created_at`), a mesma regra que o projeto já
  usa para contar "novos clientes". Motivo do fallback: só 16 dos 125
  clientes têm `account_created_at`, mas todos têm `created_at`, e os dois
  nunca diferem mais de 1 dia. Data no fuso de Brasília (função
  `formatBrtDate` que já existia; 3 testes novos protegem o fuso).

## 15/10/2026 — Agente Claude (chat)

- 🚨 **Site fora do ar por ~18h30 (14/10 23h27 → 15/10 ~18h) corrigido.**
  Todas as páginas davam "This page didn't load" (erro 500 com
  `createServerFn(...).middleware(...).inputValidator is not a function`).
  Causa: o `package-lock.json` estava desatualizado em relação ao
  `package.json`; a Vercel roda `npm install`, então resolveu versões
  "na hora" e passou a instalar `@tanstack/react-start` 1.169.x, que quebra
  o servidor. O teste do GitHub não pegou porque usa `bun` com outro
  arquivo de versões (`bun.lock`, que estava coerente). Nenhuma venda
  perdida (nenhum evento aberto para venda). Mitigação imediata: deploy
  `5bb017b` promovido a produção. Correção definitiva: travadas em versão
  exata `@tanstack/react-start` 1.168.60, `@tanstack/react-router` 1.170.41
  e `@tanstack/router-plugin` 1.168.42 (precisam andar juntas: o react-start
  exige exatamente o router 1.170.41, e o router-plugin 1.168.42 é o que
  aceita esse router) e `package-lock.json` regenerado e provado com
  `npm ci`. **Regra daqui pra frente: ao mexer em dependências, regenerar o
  `package-lock.json` junto e validar com `npm ci`; não deixar versões
  flutuarem com `^`.** Validado antes de publicar: build no formato da
  Vercel + servidor real respondendo 9 rotas + tipos + testes.
- ✨ **Teste de fumaça do servidor (`npm run smoke:ssr`)**, também no teste
  automático do GitHub. Monta no formato da Vercel, sobe o servidor e abre 8
  páginas reais (`/`, `/login`, `/links`, evento, checkout, `/cliente`,
  `/admin`, `/checkin`); falha se alguma der 500 ou mostrar "This page didn't
  load". Provado nos dois sentidos: com as versões travadas as 8 respondem;
  no estado exato que derrubou o site (`ff00c46`) as 8 dão 500 e o teste
  manda não publicar. Regra nova em `CLAUDE.md` ("dependências e
  publicação").
  Na primeira execução no GitHub o passo falhou: o app exige **Node 22+**
  (o cliente do banco usa WebSocket nativo; reproduzido localmente com Node
  20) e o GitHub roda Node 20 por padrão. `quality.yml` agora fixa Node 22
  (a Vercel já roda 22+). Segunda falha no GitHub: com `GITHUB_ACTIONS`
  definido, `VERCEL=1` sozinho não faz a montagem sair no formato da Vercel
  (reproduzido localmente); o script agora também passa
  `NITRO_PRESET=vercel`.

## 14/10/2026 — Agente Claude (chat)

- 🚨 **Check-in: alertas claros de ingresso de evento passado e de ingresso
  já utilizado.** Problema real: cliente tentou entrar com ingresso de um
  evento passado e a tela só dizia "Ingresso inválido". Agora a função
  `checkin_ticket_for_event` devolve `evento_passado` quando o ingresso é
  de OUTRO evento que já passou ou foi encerrado (com nome do participante
  e evento de origem; gravado no histórico do check-in) e a tela mostra
  "INGRESSO DE EVENTO PASSADO" (vermelho, ícone de calendário, evento de
  origem) e "INGRESSO JÁ UTILIZADO" (âmbar, nome e hora do primeiro uso),
  com vibração do aparelho; o histórico ganhou o rótulo de cada caso.
  Ingresso de evento FUTURO continua "inválido" (não é "passado"). Lógica
  em `src/lib/checkin-result.ts` (7 testes). Modo offline: o alerta
  específico depende de consultar o servidor; offline segue "inválido".
- 🔒 **Check-in: só a equipe valida ingresso.** `checkin_ticket_for_event`
  não conferia o papel de quem chamava (qualquer cliente logado podia
  marcar ingresso como usado); agora exige admin, colaborador ou
  operador_checkin. A função antiga `checkin_ticket` (sem amarração ao
  evento; app parou de usar em 22/09) foi fechada para visitantes e
  logados. Testado em simulação desfeita com operador, admin e cliente.
  Migration `20261016200041_checkin_evento_passado_e_permissao`.
- 🐛 **Check-in: operador agora consegue sair da conta.** Problema real:
  operador de check-in que entrou não conseguia deslogar. Causa: a tela de
  check-in não usa layout (é a câmera em tela cheia), e é nos layouts que
  fica o "Sair"; além disso, sem evento ativo a tela cobre tudo e o único
  botão era "Ir para Eventos", área que o operador não pode abrir.
  Novo `CheckinLogoutButton`: ícone discreto no cabeçalho da câmera, ao lado
  de "Tela cheia", com confirmação; avisa se há check-ins feitos offline
  ainda não enviados. Na tela "Nenhum evento ativo" aparece "Sair da conta"
  (e "Ir para Eventos" só para admin/colaborador). Se o encerramento no
  servidor falhar (sem internet), limpa a sessão só do aparelho e vai para
  o login, para ninguém ficar preso.

## 10/10/2026 — Agente Claude (chat)

- ✨ **Nova página pública `/links` (link da bio do Instagram).** Logo
  TicketFlow centralizado, pergunta "O que você deseja?", botão em
  destaque "Comprar ingresso" e, mais abaixo, "Criar Conta", "Fazer Login"
  e "Redefinir Senha" (leva a `/recuperar-senha`). Mobile first, tema
  claro/escuro, sem login. "Comprar ingresso" leva ao próximo evento
  publicado, não encerrado e ainda por vir (`/e/<slug>`), com nome e data
  do evento embaixo; sem evento, o botão fica desativado com aviso.
  `Brandmark` ganhou o tamanho `xl`. `/links` entrou na lista de rotas
  públicas do `auth-context`, para quem já está logado não ser
  redirecionado ao painel ao abrir o link. Sem mudança no banco.
- ✨ **`/links`: botão verde do WhatsApp no rodapé**, levando ao WhatsApp
  oficial do TicketFlow (+55 22 99785-1781, `wa.me/5522997851781`). Novo
  componente `WhatsAppIcon` (desenho do Simple Icons, domínio público).

- ✨ **Remarketing: o contato agora é salvo e existe o card "Recuperados".**
  O botão de WhatsApp tentava gravar `remarketing_contacted_at` direto na
  tabela `sales`, mas a policy "No direct update on sales" bloqueia todo
  UPDATE direto e o banco devolvia sucesso sem alterar nada — 0 contatos
  salvos em 51 vendas expiradas. Nova função `mark_remarketing_contacted`
  (admin/colaborador, guarda só o 1º contato; migration
  `20261010130000`). O lead vira "Já contactado"; quem foi contactado e
  pagou depois (a própria reserva ou compra nova no evento) vira
  "Recuperado". Cards "Aguardando pagamento" e "Expirados" removidos; novo
  card "Recuperados" (com % dos contactados); "Valor potencial" não soma
  recuperados. Comparação de WhatsApp só por dígitos. (`153fe95`)
- 🔒 **Redefinição de senha: link no endereço público oficial e tela com
  aviso de link vencido.** O link usava `window.location.origin`; pedido a
  partir de endereço temporário da Vercel (deploy/branch, protegido por
  login da Vercel) levava o cliente ao login da Vercel. Novo
  `src/lib/site-url.ts` (`getPublicSiteUrl`: `VITE_SITE_URL`, reserva
  `ticketflow-core.vercel.app`) usado em `/recuperar-senha` e no cadastro.
  `/redefinir-senha` mostra "Link vencido ou já usado" + "Pedir novo link".
  (`88a3b3a`)
- 📝 **E-mail profissional de redefinição de senha (config no painel do
  Supabase, fora do código).** Projetos novos no plano gratuito não editam
  modelos de e-mail sem SMTP próprio. Configurado SMTP provisório pelo
  Gmail `ticketflow.confirmacoes@gmail.com` (senha de app, só no Supabase),
  modelo "Reset Password" em PT-BR versionado em
  `docs/emails/redefinir-senha.html`, e Site URL / Redirect URLs ajustados
  para `https://ticketflow-core.vercel.app`. O SMTP próprio também remove o
  limite de 2 e-mails/hora do envio padrão. Pendente: domínio próprio.

- 🐛 **Pagamento aprovado depois da reserva expirar não é mais descartado.**
  Incidente real: venda `1A494A29` (R$ 25,00). O Pix é criado sem prazo de
  validade, então o QR Code seguia pagável no Mercado Pago depois dos 15
  min da reserva; o webhook chamava `confirm_sale_paid`, que recusa venda
  expirada, e respondia "ok" sem registrar nada. Achado pela conferência
  de pagamentos. Regra de negócio: o prazo só dá urgência ao cliente, todo
  pagamento aprovado é bem-vindo. Agora, se `confirm_sale_paid` recusar, o
  webhook chama a nova `confirm_late_paid_sale`: com estoque, confirma,
  baixa o estoque de novo e segue o fluxo normal (ingresso, e-mail, push
  "pagamento após o prazo"); sem estoque, ou em qualquer estado inesperado,
  anota na venda e avisa a equipe por push (`late-paid-<id>`). Aviso
  repetido continua idempotente. Função só para `service_role`. Lógica de
  decisão em `src/lib/mp/late-payment.ts` (5 testes). Migration
  `20261010015324_confirm_late_paid_sale`.
- 🔓 **Reserva expirada não bloqueia mais quem quer pagar.** Regra de
  negócio: o prazo da reserva só dá urgência; todo pagamento é bem-vindo.
  (1) Tela de pagamento (`CheckoutPage`): ao expirar, o cliente não é mais
  expulso do Pix nem perde o QR Code (antes voltava ao formulário com
  "o estoque foi liberado"); aparece "Tempo de reserva encerrado, mas você
  ainda pode pagar. Se o ingresso esgotar, entraremos em contato." e a
  tela segue acompanhando o status até a confirmação. (2) `createMpPix`:
  em vez de recusar "Esta reserva expirou", chama a nova
  `reopen_expired_sale`: com estoque, reabre a reserva (baixa o estoque de
  novo e dá prazo novo); sem estoque, único bloqueio, com mensagem clara
  ("Os ingressos deste lote esgotaram..."). O Pix usa a venda como chave de
  idempotência no Mercado Pago, então pedir de novo devolve o mesmo QR
  Code (sem pagamento em dobro). Caminho normal (reserva dentro do prazo)
  não muda. Lógica em `src/lib/mp/reopen-sale.ts` (4 testes). Migration
  `reopen_expired_sale` (só `service_role`).
- 🧾 **Correção manual da venda `1A494A29`** (venda confirmada e ingresso
  `1A494A29-1` emitido direto no banco; e-mail não foi enviado). Na
  correção manual o estoque do lote não foi baixado de novo e foi acertado
  em seguida (2º Lote: 91 → 90). **Regra de estoque a lembrar:**
  `ticket_batches.quantity` é o estoque que RESTA; diminui ao criar a
  reserva e VOLTA quando a reserva expira (`expire_pending_sales_job`).
  Reativar venda expirada exige baixar o estoque de novo.

## 08/10/2026 — Agente Claude (chat)

- ✨ **Conferência de pagamentos com o Mercado Pago (só leitura).** Botão
  com ícone de atualizar no cabeçalho do painel, ao lado do sino de
  notificações (visível só para admin). Ao parar o mouse mostra uma dica
  curta; ao clicar abre uma janela que roda a conferência e mostra o
  resultado (antes era um cartão no dashboard). Compara as vendas dos últimos 7 dias que têm Pix gerado
  com o status real do pagamento no Mercado Pago e lista divergências:
  pago no MP e não confirmado, valor ou referência diferente, e venda
  confirmada mas estornada/contestada no MP. **Não altera nenhuma venda.**
  Limites: 120 vendas por conferência, 4 consultas em paralelo, 8 s por
  consulta. Lógica pura em `src/lib/mp/reconcile.ts` (9 testes); função de
  servidor em `src/lib/mp/reconcile.functions.ts` (exige admin da
  organização). Ainda não testada contra o Mercado Pago real.
- 🐛 **Alerta de falhas de Pix no painel: acabou o alarme falso.** Antes, se
  o cliente tentava de novo e o Pix saía, o registro da falha antiga
  mantinha a faixa vermelha por 24h. Agora só conta falha de venda que
  ficou sem Pix (`mp_payment_id` vazio). Mudança só na consulta do painel
  (`dashboard-queries.ts`); a geração do Pix não foi tocada. Regra
  extraída para `src/lib/pix-failures.ts` com 3 testes novos.

## 07/10/2026 — Agente Claude (chat)

- 🔒 **Security Advisor: fechado o acesso externo a 5 funções internas do
  banco.** `grant_xp_new_account`, `grant_xp_on_checkin`,
  `grant_xp_on_sale_paid` e `enforce_single_active_banner` (gatilhos que
  só o próprio banco dispara) deixam de ser chamáveis por visitantes e
  por usuários logados; `link_guest_purchases_to_current_customer` deixa
  de ser chamável por visitantes (segue liberada para logado). Nenhuma
  tela as chamava. Testado antes: gatilho continua disparando mesmo sem
  permissão de chamada. Alertas do Advisor: 60 → 52. Migration
  `20261008024752_revoke_internal_function_execute`.
- 🐛 **Zerados os 23 erros de typecheck** (antes: 3 importantes e 20
  avisos). Importantes: (1) Pix retomado sem imagem de QR Code agora
  mostra a instrução de usar o copia e cola, em vez de imagem quebrada;
  (2) e (3) criar e editar evento com data/horário inválido agora mostra
  "Data ou horário do evento inválido" em vez de falhar no banco com erro
  genérico. Os 20 avisos eram "valor possivelmente vazio" já tratado no
  código; ajustes sem mudança de comportamento. A tela de erro geral
  também passou a aceitar erro que não seja `Error`. (`d459aba`)
- ✨ **Typecheck no pipeline**: novo script `bun run typecheck`
  (`tsc --noEmit`) e passo "Typecheck" em `quality.yml`, antes dos
  testes. Motivo: o pipeline só rodava testes e build, então erros de
  tipo novos (inclusive os gerados pelo Lovable) passavam sem aviso.
  (`d459aba`)
## 06/10/2026 — Agente Claude

- 📝 Limpeza de dados de teste: apagadas do banco 4 vendas **canceladas** do dia (`B0BC7A90`, `8C2FD1CD`, `4C2E1D9C`, `EC491041`), a pedido do dono. Todas sem ingresso, pagamento ou reembolso; os Pix gerados expiram sozinhos no Mercado Pago.
- 🎨 Ícones do app (PWA, favicon, ícone do iPhone) regenerados a partir do `ticketflow-icon.svg` (ingresso verde inclinado). Antes, as imagens ainda eram o desenho antigo (ingresso branco com QR). O logo dentro do sistema continua sendo o `Brandmark.tsx`, que acompanha o tema. O ícone do iPhone tem fundo cinza-escuro (#383B43), porque o iOS não aceita fundo transparente. (`16a57a1`)
- ✨ Vendas → Nova Venda: agora dá para buscar um cliente cadastrado (por nome, WhatsApp ou e-mail) e lançar o ingresso direto na conta dele. "Novo comprador" continua disponível. Sem mudança no banco: usa a função `create_manual_sale` existente com os dados exatos do cadastro. (`5cc951a`)
- 🐛 Pix: o identificador do dispositivo deixou de poder impedir a geração do Pix. O servidor descarta o valor se vier fora do formato, e a tela tenta de novo sem ele se a 1ª tentativa falhar. Erros do Pix passam a ser registrados nos logs da Vercel. Causa exata ainda não confirmada (erro vinha sem registro); depois disso as vendas online seguiram normais. (`07b7a93`)
- 🐛 Vendas online pagas agora gravam a data/hora do pagamento (`sales.paid_at`): a função `confirm_sale_paid` do banco foi atualizada (migration `20261006120000`). Antes o campo ficava vazio. Vendas pagas antes de 06/10 continuam sem a data (2 casos). (`84921b6`)

## 05/10/2026 — Agente Claude 2

- ✨ **Testes automáticos de Pix, assinatura do webhook e retorno ao
  checkout**: 3 arquivos de teste novos, 44 testes no total, todos
  passando; o pipeline agora roda todos. Refatoração sem mudança de
  comportamento: montagem do Pix e conferência da assinatura saíram de
  `mercado-pago.functions.ts` e `webhook.ts` para módulos puros
  testáveis. `safeReturnTo` também passou a recusar `..` no caminho.
  (`385b173`)

## 04/10/2026 — Agente Claude 2

- ✨ **Toggle "Compra sem cadastro" nas Preferências do Admin**: ligado
  (padrão) = qualquer pessoa compra sem conta, como já era; desligado =
  o cliente vê "Entre para comprar" no checkout, entra ou cria conta e
  volta direto ao checkout (parâmetro `voltar`, só caminhos `/e/...`). A
  regra vale para todos os eventos ativos e também é imposta no banco
  (`create_pending_sale` recusa venda sem login). Banco: coluna
  `organizations.allow_guest_checkout` (padrão `true`), função
  `is_guest_checkout_allowed` e migration
  `20261004120000_add_guest_checkout_toggle`. O link de confirmação de
  e-mail do cadastro também volta ao checkout (depende de a URL estar
  liberada no Supabase). **Pendente:** testar com evento ativo, ligado e
  desligado. (`ffadc1e`, `12b6a40`)
- 🎨 **Preferências reorganizadas**: linhas compactas, campos menores e
  explicações atrás de ícone (i) (`InfoHint`), no lugar de textos
  longos. (`ffadc1e`)
- ✨ **"Unificar listas de PDF" agora funciona**: antes era um switch
  que não salvava nem era usado. Ligado (padrão): o PDF de check-in traz
  vendas pagas + cortesias numa lista só, nas telas Vendas e Cortesias;
  desligado: Vendas só compradores e Cortesias só cortesias. Banco:
  coluna `organizations.unify_checkin_pdf` e migration
  `20261004130000_add_unify_checkin_pdf_preference`. **Pendente:**
  conferir o PDF com evento ativo. (`e4de0d2`)
- ✨ **Qualidade da integração Mercado Pago**: o Pix agora envia a
  descrição do item (id do lote, título do evento, categoria `tickets`,
  quantidade e preço), carrega o SDK oficial `MercadoPago.JS V2` com o
  script de segurança e envia o código do dispositivo no cabeçalho
  `X-meli-session-id`, e usa `INGRESSO-TICKETFLOW` como descrição na
  fatura. Se o SDK falhar, o Pix sai normalmente — nunca bloqueia a
  compra. **Pendente:** validar com um Pix real em evento ativo e
  acompanhar a nota no painel do Mercado Pago. (`414d353`)
- 🔒 **Bibliotecas com falha de segurança atualizadas**: `nodemailer`
  10.0.0 → 10.0.14 (falha de nível alto, afetava envio do ingresso por
  e-mail) e `dompurify` 3.4.12 → 3.4.16. Restam 3 avisos em ferramentas
  de build (`js-yaml`, `nanoid`), sem efeito no site em produção. O
  `bun.lock` ainda tem pacotes apontando para o registro do Lovable
  (`pkg.dev/lovable-core-prod`) — hoje o deploy funciona, mas vale
  migrar quando for conveniente. (`6176db9`)
- 🔒 **Limite de reservas pendentes por pessoa**: `create_pending_sale`
  recusa a 4ª reserva não paga de um mesmo WhatsApp ou e-mail no mesmo
  evento, com trava de concorrência para tentativas simultâneas. Compra
  sem cadastro continua liberada. Limite conhecido: quem trocar WhatsApp
  e e-mail a cada tentativa passa; limite por IP ficou de fora por
  decisão do Diego (afetaria clientes na mesma rede de Wi-Fi). Migration
  `20261004140000_limit_pending_sales_per_buyer`. **Pendente:** validar
  com evento ativo (4ª tentativa recusada, compra normal segue).
  (`49cda8b`)
- 🔧 **Endereço de reserva do Mercado Pago apontava para o Lovable (fora
  do ar)**: usado só quando falta a variável `VITE_SITE_URL`; trocado
  para `https://ticketflow-core.vercel.app`. Como a Vercel já tem essa
  variável configurada, não muda nada na prática hoje — é uma rede de
  segurança para o caso de faltar. (`3bf4635`)
- 📝 Confirmado: painel do Mercado Pago com webhook já apontando para a
  Vercel; Supabase → Authentication → URL Configuration com Site URL e
  Redirect URLs só da Vercel (removidas as referências ao Lovable).

## 01/10/2026 — Agente 01 (Claude)

- 🎨 **Logo unificado** entre sidebar do Admin, header do Cliente, Login,
  Cadastro e telas de senha — existiam 4 versões visuais diferentes do
  mesmo logo; criado componente único `Brandmark`. De quebra, corrigiu um
  bug de texto invisível no tema claro do Cadastro. (`ee82b07`)
- 🐛 **Módulo Usuários inacessível**: a tela sempre redirecionava para
  Vendas, até para administradores reais — a checagem de permissão
  dependia de um dado nunca preenchido pelo sistema. (`42d9423`)
- 🐛 **Botão "Remover" não cancelava convite pendente**: funcionava só
  para quem já tinha conta; convite pendente ficava órfão mesmo com a
  mensagem de sucesso. Criada função `remove_user_or_invite`. (`42d9423`)
- 🐛 **Assistente do Mercado Pago inacessível**: mesmo bug de permissão
  do item acima, numa tela ainda mais crítica — sem abrir, não dava para
  configurar o Pix de jeito nenhum. (`2507b52`)
- 🔒 **Falha de segurança no salvamento de credenciais do Mercado Pago**:
  as funções de servidor não conferiam quem estava chamando — qualquer
  pessoa que descobrisse o endereço poderia trocar as credenciais de
  pagamento de qualquer organização. Corrigido com checagem de admin.
  (`2507b52`)
- 🐛 **Salvar só o webhook secret apagava o Access Token** já salvo (e
  vice-versa) por sobrescrita sem preservar o que não foi reenviado.
  Correção convergiu com um fix equivalente aplicado em paralelo por
  outro agente. (`66a7e43`)
- 🐛 **Botão "Criar PIX de teste" nunca funcionava**: tentava inserir
  direto na tabela `sales`, bloqueado por regra de segurança do banco,
  com um evento/lote inventado que não existe. Criada função
  `create_mp_test_sale`, usando um evento real da organização. (`66a7e43`)
- 📝 Registrada a causa raiz de fundo do problema do Pix: Lovable e
  Vercel guardam a chave de criptografia (`APP_ENCRYPTION_KEY`) em
  variáveis de ambiente separadas — credencial salva numa plataforma não
  descriptografa na outra. Ação pendente, fora do repositório: igualar a
  variável nas duas plataformas ou definir uma só como produção.
  (`6460526`)
- 🐛 **Duas versões de funções do banco coexistindo** (`create_locked_tickets`,
  `create_pending_sale`, `update_customer`) — o sistema estava resolvendo
  chamadas para a versão antiga e já corrigida, reativando bugs já dados
  como resolvidos. Risco real: ingresso duplicado em reenvio de webhook,
  e venda sem login nunca vinculava ao cliente. Removidas as versões
  antigas; criado snapshot de todas as funções do banco como backup
  versionado (não existia controle de versão de várias delas).
- 🎨 Auditoria de aderência ao Design System: achado que o documento
  oficial descreve o tema verde antigo (v1.1) enquanto o código já roda
  o tema roxo (v1.2) — raiz de parte da sensação de inconsistência visual.
  Ver `docs/DESIGN-SYSTEM.md` para o status da correção do documento.
- 📝 Criado `CLAUDE.md` (índice de rotas) — na verdade já existia, criado
  por outro agente em paralelo; só foi complementado.
