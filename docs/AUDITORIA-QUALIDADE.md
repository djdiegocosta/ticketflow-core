# TicketFlow — Auditoria de Experiência e Confiabilidade do Evento

**Data da auditoria inicial:** 06/09/2026 20:08 BRT
**Agente da auditoria:** Claude (Sonnet)
**Branch:** `main`
**Repositório:** `djdiegocosta/ticketflow-core`
**Projeto Supabase:** `ywcdopjqfhisopipqxgq`
**Projeto Vercel:** `ticketflow-core`

## Objetivo

Este documento é irmão do `AUDITORIA.md` (segurança, banco de dados e performance), mas olha para outra frente: a experiência de quem compra ingresso e a confiabilidade do sistema no dia a dia de um evento real. O foco principal são questões que envolvem **clientes e acesso do público**; itens internos (admin/staff) aparecem apenas quando afetam esse público de forma indireta.

Segue as mesmas regras do `AUDITORIA.md`: nenhum item é removido quando resolvido, o status muda e recebe data/hora/agente/evidência.

### Status permitidos

- `ABERTO` — problema confirmado e ainda não resolvido.
- `EM ANÁLISE` — investigação iniciada, mas causa/solução ainda não confirmada.
- `RESOLVIDO` — correção aplicada e confirmada.
- `NÃO É BUG` — item investigado e confirmado como já protegido/funcionando corretamente.
- `ADIADO` — problema confirmado, mas fora da prioridade atual.

Horários neste documento são BRT (UTC-3).

---

## 1. Link do evento sem preview ao compartilhar

**ID:** QUA-001
**Status:** `RESOLVIDO`
**Severidade:** ALTA
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### Problema

As páginas públicas (`/e/:slug`, `/e/:slug/checkout`, `/e/:slug/confirmacao/:sale_code`) têm título e descrição **fixos e genéricos** ("Evento | TicketFlow", "Garanta seu ingresso para este evento exclusivo."), não o nome, data ou imagem do evento real. Não existe `og:image`.

**Arquivos:** `src/routes/e.$slug.index.tsx`, `src/routes/e.$slug.checkout.tsx`, `src/routes/e.$slug.confirmacao.$sale_code.tsx`

### Impacto

Quando alguém compartilha o link do evento no WhatsApp, Instagram ou Facebook, o preview que aparece não mostra nome, data nem imagem do evento — apenas um card genérico do TicketFlow. Como esse compartilhamento costuma ser o principal canal de divulgação de um evento, isso reduz a taxa de clique e prejudica vendas diretamente.

### Correção aplicada

Criado `src/lib/event-meta.ts` com duas funções: `fetchEventMeta(slug)` busca título, descrição, imagem, data e local do evento publicado; `buildEventMeta(event, opts)` monta o título/descrição/og:image reais a partir desses dados, com `titleSuffix` e `descriptionOverride` opcionais por etapa.

As três rotas públicas passaram a usar `loader` (executa no servidor, antes de gerar o HTML) para buscar os dados e alimentar o `head()`:
- `/e/$slug/` — título e imagem do evento, descrição combinando descrição do evento, data e local.
- `/e/$slug/checkout` — mesmo evento/imagem, título com sufixo "Checkout".
- `/e/$slug/confirmacao/$sale_code` — mesmo evento/imagem, título com sufixo "Confirmação".

Quando o evento não tem imagem cadastrada, cai no `twitter:card` tipo `summary` (sem imagem) em vez de simular uma imagem inexistente.

**Arquivo novo:** `src/lib/event-meta.ts`
**Commit:** `0c49b3660328e4e4b95a54b0c0a47e8f733c29d9`

### Validação pós-correção

- Build de produção concluído sem erros.
- Deploy `dpl_Ds4gc6Wqi4jMqj6gx1Ba4WhQnTsL` concluído com `READY`.
- Pendente: Diego confirmar visualmente o preview ao colar o link de um evento real no WhatsApp (o cache de preview de cada rede social pode levar um tempo para atualizar em links já compartilhados antes desta correção).

### Resolução

- **Data:** 06/09/2026
- **Hora:** 20:38 BRT
- **Agente:** Claude
- **Evidência:** build e deploy validados; falta apenas confirmação visual do usuário no link real.

---

## 2. Recuperação de ingresso depende de um código que só aparece uma vez

**ID:** QUA-002
**Status:** `ABERTO`
**Severidade:** ALTA
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### Problema

Não existe envio automático de e-mail ou WhatsApp confirmando a compra. A única confirmação é a tela exibida no navegador logo após o pagamento. Quem compra sem estar logado (convidado) e fecha a aba só recupera o ingresso via "Buscar Ingressos" (`/meus-ingressos`), que exige saber de cor o código da venda (8 caracteres, mostrado uma única vez).

**Arquivos:** `src/pages/ConfirmationPage.tsx`, `src/pages/MyTicketsPage.tsx`

### Impacto

Cliente que compra, fecha o navegador e não anotou o código fica sem meio de recuperar o ingresso sozinho — precisa contatar o organizador manualmente. Em um evento com muita gente comprando pelo celular, isso gera atrito e mensagens de suporte evitáveis.

### Ação necessária

Enviar automaticamente e-mail (e idealmente WhatsApp) de confirmação com o código da venda e o link direto do ingresso, assim que o pagamento é aprovado.

---

## 3. Nenhum aviso de privacidade ou termos no checkout

**ID:** QUA-003
**Status:** `ABERTO`
**Severidade:** ALTA
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### Problema

O checkout coleta nome, WhatsApp, e-mail e nome de cada participante, sem nenhum link para política de privacidade, termos de uso ou aviso de como os dados são usados. Confirmado por busca no código: não existe nenhuma página nem menção a "termos de uso", "política de privacidade" ou "LGPD" em nenhuma tela pública.

**Arquivo:** `src/pages/CheckoutPage.tsx`

### Impacto

A LGPD (Lei Geral de Proteção de Dados) exige informar a finalidade da coleta de dados pessoais, independente do porte do negócio. Hoje o sistema não cumpre isso, o que é um risco tanto para o cliente quanto para o organizador (Diego é o controlador dos dados coletados).

### Ação necessária

Criar uma página simples de política de privacidade/termos e referenciá-la no checkout (link ou checkbox de aceite).

---

## 4. Ninguém é avisado quando o Pix para de funcionar para os clientes

**ID:** QUA-004
**Status:** `ABERTO`
**Severidade:** MÉDIA-ALTA
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### Problema

Quando a geração do Pix falha no checkout (como aconteceu na semana de 06/09), o erro fica registrado apenas em `sales.mp_debug_response`, visível só consultando o banco diretamente. Não existe alerta automático (e-mail, notificação no painel) avisando o organizador.

### Impacto

Esse tipo de falha só é percebido se um cliente reclamar ou se alguém for investigar manualmente — como ocorreu. Enquanto isso, todo cliente que tenta comprar no período recebe "Erro ao gerar o Pix" sem que ninguém do lado do organizador saiba que está acontecendo.

### Ação necessária

Um alerta simples (e-mail para o Diego, por exemplo) quando `createMpPix` falhar, ou um indicador visível no Dashboard quando houver falhas recentes de geração de Pix.

---

## 5. Proteção contra venda duplicada de ingresso

**ID:** QUA-005
**Status:** `NÃO É BUG`
**Severidade:** — (verificado, sem problema)
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### O que foi verificado

Duas preocupações comuns em sistemas de venda de ingresso, testadas direto no banco:

- **Dois clientes comprando o último ingresso ao mesmo tempo:** `create_pending_sale` usa `SELECT ... FOR UPDATE` no lote e um `UPDATE ... WHERE quantity >= _quantity` atômico. Está protegido contra vender mais ingressos do que o estoque, mesmo com dois compradores simultâneos.
- **Mercado Pago reenviando a notificação de pagamento duas vezes (comportamento normal do Mercado Pago):** `confirm_sale_paid` só muda o status se a venda ainda estiver `pendente`, e `create_locked_tickets` só insere um ingresso se ele ainda não existir (`WHERE NOT EXISTS`). Uma segunda notificação do mesmo pagamento não gera ingresso duplicado.

### Conclusão

Não é necessário nenhum ajuste aqui. Registrado para constar que a checagem foi feita.

---

## 6. Comportamento do Pix quando expira na tela do cliente

**ID:** QUA-006
**Status:** `NÃO É BUG`
**Severidade:** — (verificado, sem problema)
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### O que foi verificado

Quando o cronômetro do Pix chega a zero, o sistema mostra um aviso claro ("O tempo para pagamento expirou. O estoque foi liberado.") e devolve o cliente para o início do formulário automaticamente, sem deixá-lo travado numa tela de QR Code morto.

**Arquivo:** `src/pages/CheckoutPage.tsx`

### Conclusão

Comportamento adequado, sem ação necessária.

---

## 7. Check-in com internet instável no dia do evento

**ID:** QUA-007
**Status:** `NÃO É BUG`
**Severidade:** — (verificado, sem problema)
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### O que foi verificado

A tela de check-in (`src/pages/CheckinPage.tsx`) já tem um mecanismo de fila offline (`offlineDB`): detecta quando a internet cai, guarda os check-ins localmente e sincroniza automaticamente quando a conexão volta.

### Conclusão

Já resolvido em uma rodada anterior. Não é um item novo, mas fica registrado que foi conferido nesta auditoria.

---

## 8. Zero testes automatizados protegendo o fluxo de compra

**ID:** QUA-008
**Status:** `ABERTO`
**Severidade:** MÉDIA
**Descoberta:** 06/09/2026 20:08 BRT
**Agente:** Claude

### Problema

Não existe nenhum teste automatizado no repositório (nenhum arquivo `.test.` ou `.spec.`). Toda alteração de código depende de teste manual para garantir que o checkout, o Pix e o check-in continuam funcionando.

### Impacto

Não afeta o cliente diretamente hoje, mas é o tipo de lacuna que permite que um bug no fluxo de pagamento chegue a produção sem ninguém perceber antes de um cliente real ser afetado — como quase aconteceu com o Pix.

### Ação necessária

Fora do foco principal desta auditoria (que é experiência do cliente), mas registrado para priorização futura: pelo menos um teste automatizado cobrindo o fluxo completo de compra (criar venda → gerar Pix → confirmar pagamento → gerar ingresso).

---

# Prioridade sugerida

1. **QUA-002** — confirmação automática por e-mail/WhatsApp (afeta recuperação de ingresso).
2. **QUA-003** — aviso de privacidade/termos (risco legal).
3. **QUA-004** — alerta de falha no Pix (evita descobrir problema só quando o cliente reclama).
4. **QUA-008** — testes automatizados (proteção de longo prazo, menor urgência).

QUA-001 já foi corrigido. QUA-005, QUA-006 e QUA-007 foram verificados e não precisam de ação.

---

# Histórico de alterações deste documento

| Data | Hora BRT | Agente | ID | Alteração |
|---|---:|---|---|---|
| 06/09/2026 | 20:08 | Claude | — | Auditoria inicial registrada: 8 itens (4 abertos, 3 verificados sem problema, 1 aberto de menor prioridade). |
| 06/09/2026 | 20:38 | Claude | QUA-001 | Meta tags dinâmicas implementadas (título, descrição e og:image reais do evento) nas 3 páginas públicas; build e deploy validados. |

**Regra permanente:** problemas resolvidos não devem ser apagados deste documento. Apenas seu status é alterado, com data, hora, agente e evidência.
