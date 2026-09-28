# TicketFlow — Otimização do carregamento inicial (boot)

**Atualizado:** 28/09/2026
**Branch:** `perf/otimizacao-carregamento-inicial`
**Escopo:** desempenho de inicialização do sistema inteiro (Visitante, Cliente, Admin, Check-in). **Fora do escopo:** offline, checkout, Mercado Pago, modelo de dados, regras de evento operacional/encerrado.

> Leia este documento antes de mexer em `auth-context.tsx`, `auth-guard.ts`, `__root.tsx`, `router.tsx` ou em qualquer `beforeLoad`. As regras da seção 5 existem para o problema abaixo não voltar.

---

## 1. Sintoma

Ao abrir o TicketFlow no celular, ~4 segundos de tela totalmente branca antes de aparecer qualquer interface — em todas as áreas, não só na Área do Cliente.

## 2. Método e limites da medição

Diagnóstico feito **lendo o código e o build** (não presumido). **Não foi possível medir tempos reais**: o ambiente de análise não alcança o domínio do Supabase e não há navegador de teste. Por isso este documento traz **contagem de idas ao servidor e ordem de dependência** (fatos do código) e **não inventa milissegundos**. O tempo de cada ida ao servidor no celular do usuário é o que multiplica esses números — a validação final deve ser feita no aparelho (ver seção 7).

## 3. Causas encontradas

### Causa principal — fila de idas ao servidor antes de qualquer tela

**`/cliente` (cliente logado), como era:** o `beforeLoad` da rota bloqueava a renderização com **6 idas ao servidor em fila**:

`getUser` → `user_roles` → RPC `get_single_organization_id` → `organizations.status` → **RPC `get_single_organization_id` de novo** (repetida em `cliente.tsx`) → `get_or_create_customer`.

E isso rodava **a cada navegação** dentro de `/cliente/*` (o `beforeLoad` do pai é reavaliado em toda navegação), não só na abertura.

**`/admin`, como era:** o `AuthProvider` fazia `user_roles` → RPC de organização → `organizations.status` em fila (3 idas) e o guard do admin devolvia `null` enquanto `loading` — **tela branca literal** até terminar.

**Duplicação (mesma informação buscada por 3 donos):**

| Consulta | Quem pedia |
|---|---|
| `user_roles` | AuthProvider + guard (`requireSession`) |
| RPC `get_single_organization_id` | AuthProvider + guard + `cliente.tsx` |
| `organizations.status` | AuthProvider + guard |

Nenhum consumidor usa `organizationStatus` (nem o do contexto, nem o retornado pelo guard) — era custo puro no caminho crítico. O `context.auth` devolvido pelo guard também não é lido por nenhuma rota/tela.

### Causas secundárias

1. **Google Fonts como `<link rel="stylesheet">` no `<head>`**: CSS externo em `<head>` é bloqueante — o navegador não pinta nada até baixá-lo (2 saltos: `googleapis` → `gstatic`).
2. **Nada visível no HTML das rotas `ssr: false`** (Admin, Cliente, Check-in, Login): o servidor entregava um `<body>` vazio; a primeira pintura só acontecia depois de baixar/executar o JS **e** terminar a autenticação. O roteador não tinha `pendingComponent`.
3. **Meta Pixel e registro do Service Worker** disputando rede/CPU com o boot (não bloqueavam a interface, mas competiam por banda no celular).
4. **Flash de tema**: o tema escuro só era aplicado depois da hidratação (usuário do tema escuro via um quadro claro).

## 4. O que foi feito

| # | Mudança | Arquivos |
|---|---|---|
| 1 | **Snapshot de autenticação** (`papel` + `organização`): busca em **paralelo**, junta chamadas simultâneas (dedupe), cache de **30s** e **nunca cacheia erro**. AuthProvider, guard e `/login` usam o mesmo. Mantém o retry único de 600 ms **somente no caminho de erro**. | `src/lib/auth-snapshot-core.ts` (puro/testável), `src/lib/auth-snapshot.ts` (Supabase) |
| 2 | **Guard sem repetição**: `getSession()` (leitura local, sem rede) para saber quem é; depois, **em paralelo**, validação no servidor (`getUser`) + snapshot. A validação no servidor **continua existindo**, mas não é repetida a cada navegação dentro de 30s. | `src/lib/auth-guard.ts` |
| 3 | **Status da organização saiu do caminho crítico**: carregado em segundo plano depois do primeiro render. No guard passou a ser sempre `null` (ninguém usava). | `src/lib/auth-context.tsx`, `auth-guard.ts` |
| 4 | **`get_or_create_customer` deixou de bloquear `/cliente`**: novo hook `useEnsureCustomerRecord` só chama a RPC (a mesma, idempotente) quando a consulta dos registros do cliente já terminou **e veio vazia** — no caso normal não há chamada nenhuma. RPC de organização duplicada removida. | `src/routes/cliente.tsx`, `src/lib/customer-queries.ts` |
| 5 | **Skeleton imediato, sem nova identidade visual**: `defaultPendingComponent` no roteador reaproveitando o `SkeletonScreen` já adotado. Como as rotas são `ssr: false`, o skeleton **já vai no HTML do servidor** (verificado em `/cliente`, `/admin`, `/login`). `pendingMinMs = 0` para não segurar o skeleton por tempo artificial (o padrão do roteador é 500 ms). O guard do admin trocou `return null` por esse skeleton. | `src/components/RoutePending.tsx`, `src/router.tsx`, `src/routes/admin.route.tsx` |
| 6 | **Fontes sem bloquear a pintura**: a folha do Google Fonts é injetada por script (CSS inserido por script não é render-blocking) + `<noscript>` de fallback. O `display=swap` e a pilha de fallback (`ui-sans-serif, system-ui`) já existentes mantêm o texto visível; a Geist entra assim que chega. Identidade visual preservada. | `src/routes/__root.tsx` |
| 7 | **Tema escuro antes do primeiro paint** (script no `<head>`) + `ThemeProvider` não desfaz mais a classe na 1ª execução. | `src/routes/__root.tsx`, `src/lib/theme.tsx` |
| 8 | **Efeitos secundários fora do boot**: o *download* do `fbevents.js` (Meta Pixel) e o registro do Service Worker esperam o evento `load` da página. A fila do `fbq` é criada na hora, então `init`/`PageView` continuam valendo. O SW **não teve nenhuma mudança funcional** (continua sem listener de `fetch`, sem offline). | `src/routes/__root.tsx` |
| 9 | **Testes** que protegem o snapshot (paralelismo, dedupe, TTL, retry, não-cache de erro, limpeza no logout). **Atenção:** o workflow `.github/workflows/quality.yml` ainda roda só `tests/checkout-prefill.test.ts`; falta trocar a linha do passo de testes por `bun test tests/checkout-prefill.test.ts tests/auth-snapshot.test.ts` (não foi possível alterar o workflow nesta entrega — o token de acesso usado não tem permissão de workflow). | `tests/auth-snapshot.test.ts` |

### Fluxo — antes e depois (`/cliente`, cliente logado, abertura a frio)

```
ANTES  (bloqueia a interface)
getUser → user_roles → rpc org → org.status → rpc org (dup) → get_or_create_customer → render
  (+ AuthProvider repetindo user_roles → rpc org → org.status em paralelo, competindo)

DEPOIS
HTML já com skeleton
getSession (local) → [ getUser ‖ user_roles ‖ rpc org ] → render
  org.status e (só se faltar) get_or_create_customer → em segundo plano
```

Idas ao servidor relacionadas à autenticação na abertura a frio de `/cliente` (contagem pelo código): **antes ≈ 9** (getUser 1 + user_roles 2 + rpc org 3 + org.status 2 + get_or_create 1), **6 delas em fila**; **depois = 3 em paralelo** (getUser, user_roles, rpc org) **+ 1 em segundo plano** (org.status). Navegações seguintes em até 30s: **0** idas do guard (antes: 4 a 6 por navegação).

## 5. Regras para não reintroduzir o problema

1. **`beforeLoad` e providers globais não fazem consulta própria de papel/organização.** Use `authSnapshots.get(userId)` (`src/lib/auth-snapshot.ts`).
2. **Consultas independentes rodam em paralelo** (`Promise.all`), nunca em `await` em fila.
3. **Nada de "dado secundário" no caminho crítico.** Se nenhuma tela decide o primeiro render com o dado, ele carrega depois (como o status da organização).
4. **Efeito de boot novo (script, pixel, SW, fonte, analytics) nunca bloqueia a pintura**: injete por script/`load`, sem `<link rel="stylesheet">` externo no `<head>`.
5. **Não use `return null` enquanto autentica** — use `RoutePending`/`SkeletonScreen`.
6. **Não adicionar `setTimeout` para "disfarçar" espera** e não voltar `defaultPendingMinMs` ao padrão de 500 ms.
7. **Não cachear resposta com erro** no snapshot (uma falha passageira não pode virar "cliente"/"sem organização" por 30s).
8. **Autorização real continua no banco (RLS/RPC).** O guard e o cache são otimização de leitura/UX; não afrouxar políticas por causa deles.
9. **Compatibilidade Safari/iOS 15.8** (build `target: "safari15"`): nada de API sem fallback (ex.: `requestIdleCallback` não existe no Safari 15 — por isso usamos o evento `load`).

## 6. Decisões e riscos aceitos (para revisão do produto)

- **Janela de 30s**: uma troca de papel ou revogação de sessão pode levar **até 30s** para ser percebida **pelo guard de rota** (o RLS do banco continua valendo imediatamente em cada consulta). O valor está em `ttlMs` (`auth-snapshot-core.ts`).
- **Cliente sem registro em `customers`** (caso raro; o cadastro normal já cria o registro): a área agora renderiza primeiro e o registro é criado em segundo plano, com nova consulta logo depois — pode aparecer um instante de "sem dados" nessa situação específica. Antes a tela esperava.
- O **skeleton** agora aparece enquanto a rota está de fato pendente (sem timers). O `DESIGN-SYSTEM.md` descreve o skeleton pós-login com teto de 400 ms; aqui ele é controlado pelo estado real de carregamento, que é o objetivo desta tarefa.

## 7. Como validar no aparelho (não feito nesta entrega)

1. iPhone com Safari 15.8: abrir `/cliente`, `/admin`, `/checkin`, `/login` a frio (aba nova, sem cache) e comparar com a produção anterior.
2. Safari Web Inspector → aba **Rede**: conferir que a abertura a frio faz `getUser`, `user_roles` e `get_single_organization_id` **ao mesmo tempo** (uma "coluna"), sem repetição, e que `fonts.googleapis.com` não bloqueia a primeira pintura.
3. Navegar entre `/cliente/eventos`, `/ingressos`, `/pontos`, `/perfil`: o guard não deve gerar chamadas de autenticação novas dentro de 30s.
4. Testar como cliente, admin, colaborador e operador de check-in (redirecionamentos por papel).

## 8. Pendências (não feitas nesta etapa)

- **Bundle inicial**: o chunk de entrada tem ~603 KB (188 KB gz) + `utils` ~234 KB (61 KB gz), carregados em toda abertura (React, roteador, React Query, supabase-js com auth/realtime/storage). Vale avaliar, com medição, o custo do `realtime` e do `storage` do supabase-js na entrada. Os chunks pesados de rota (`admin.index` ~380 KB com gráficos, `checkin.index` ~373 KB com leitor de QR) já são carregados só nas suas rotas.
- **Consultas de dados em telas** (`useMyCustomerRecords`, `useActiveBanner` e outras em `customer-queries.ts`) chamam `supabase.auth.getUser()` (ida ao servidor) antes de buscar o dado. Não bloqueiam a rota, mas atrasam o conteúdo; candidatas a usar o snapshot/sessão local.
- **Organização buscada duas vezes** em telas (`useOrganization` com `select *` no `DesignProvider` e `useCustomerOrgDesign`) — não bloqueia o boot.
- **Cor de destaque (accent)**: hoje aplicada após a hidratação (pequeno flash de cor); pode receber o mesmo tratamento de pré-pintura do tema.
- **PageView do Meta Pixel** dispara no script global e também no `MetaPixelNavigationTracker` na primeira resolução (comportamento anterior, não alterado).
- **Offline**: intocado, tratado separadamente.
