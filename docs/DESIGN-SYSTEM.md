# TicketFlow — Design System
**Versão:** 1.1 — Agosto/2026
**Status:** Documento oficial. Todo desenvolvimento no Lovable deve seguir este sistema.

---

## 1. Princípio visual

Clean, moderno e funcional — estilo macOS. O visual não deve chamar atenção para si mesmo; deve deixar o conteúdo e as ações do usuário em primeiro plano. Poucos elementos, muito espaço, hierarquia clara.

A única cor expressiva é o verde neon de destaque. Todo o resto é cinza, branco ou preto.

---

## 2. Temas

O sistema possui dois temas: **Light** (padrão) e **Dark** (opção do usuário). Ambos seguem a mesma lógica de variáveis — só os valores mudam.

A troca de tema é feita pelo usuário e persistida (salva a preferência).

---

## 3. Paleta de cores

Todas as cores devem ser implementadas como variáveis CSS (custom properties), nunca como valores fixos no código. Isso permite a troca de tema e a futura adição de novos temas de cor (azul, vermelho, roxo — todos em neon, seguindo o mesmo padrão).

### Tema Light (padrão)

```css
/* Fundos */
--bg-primary: #FFFFFF;        /* fundo principal da página */
--bg-secondary: #F5F5F7;      /* fundo de cards, painéis, sidebar */
--bg-tertiary: #E8E8ED;       /* fundo de inputs, hover, itens selecionados */

/* Texto */
--text-primary: #1D1D1F;      /* texto principal */
--text-secondary: #6E6E73;    /* texto secundário, labels, legendas */
--text-disabled: #AEAEB2;     /* texto desabilitado, placeholder */

/* Bordas */
--border-default: #D2D2D7;    /* bordas de cards, inputs, divisores */
--border-subtle: #E8E8ED;     /* bordas muito suaves, separadores internos */

/* Destaque — Verde Neon */
--accent: #00E676;            /* cor principal de destaque */
--accent-hover: #00C853;      /* hover em elementos com destaque */
--accent-muted: #E8FFF4;      /* fundo suave para badges e alertas de sucesso */
--accent-text: #00A844;       /* texto verde (sobre fundo claro) */

/* Feedback */
--error: #FF3B30;             /* erro */
--warning: #FF9500;           /* aviso */
--success: #00E676;           /* sucesso (mesmo que accent) */
--info: #0A84FF;              /* informação */

/* Sombra */
--shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
--shadow-md: 0 4px 12px rgba(0,0,0,0.10);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
```

### Tema Dark

```css
/* Fundos */
--bg-primary: #111111;
--bg-secondary: #1C1C1E;
--bg-tertiary: #2C2C2E;

/* Texto */
--text-primary: #F5F5F7;
--text-secondary: #8E8E93;
--text-disabled: #48484A;

/* Bordas */
--border-default: #3A3A3C;
--border-subtle: #2C2C2E;

/* Destaque — Verde Neon (idêntico, neon funciona em dark) */
--accent: #00E676;
--accent-hover: #00C853;
--accent-muted: #0D2A1A;
--accent-text: #00E676;

/* Feedback */
--error: #FF453A;
--warning: #FF9F0A;
--success: #00E676;
--info: #0A84FF;

/* Sombra */
--shadow-sm: 0 1px 3px rgba(0,0,0,0.30);
--shadow-md: 0 4px 12px rgba(0,0,0,0.40);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.50);
```

---

## 4. Tipografia

**Fonte:** Geist (Google Fonts / Vercel). Usar Geist Sans para texto corrido e UI, Geist Mono para códigos, IDs e valores técnicos (ex.: código do ingresso, QR code).

```css
--font-sans: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'Geist Mono', 'SF Mono', monospace;
```

### Escala tipográfica

| Nome | Tamanho | Peso | Uso |
|---|---|---|---|
| Display | 32px | 700 | Títulos de página principais |
| Heading 1 | 24px | 600 | Títulos de seção |
| Heading 2 | 18px | 600 | Subtítulos, títulos de card |
| Body | 14px | 400 | Texto corrido padrão |
| Small | 12px | 400 | Legendas, labels, metadados |
| Micro | 11px | 500 | Badges, tags, status |
| Mono | 13px | 400 | Códigos, IDs, valores técnicos |

**Line height padrão:** 1.5 para body, 1.2 para headings.
**Letter spacing:** -0.01em para headings, 0 para body.

---

## 5. Bordas e arredondamento

Bordas arredondadas suaves — estilo macOS. Não usar bordas muito agressivas nem muito quadradas.

```css
> **Atualização:** cantos retos são o padrão inicial do sistema, mas a partir de agora isso é **configurável pelo usuário** (Configurações → Design), não fixo. Os dois conjuntos de valores abaixo devem existir no código, trocáveis via variável — nunca hardcoded num componente específico.
>
> **Implementado:** a escolha fica salva em `organizations.corner_style`, por organização — não é preferência local do navegador. Vale tanto para o admin quanto para as páginas públicas do evento e a Área do Cliente daquela organização. Cliente logado não tem acesso a essa escolha (é decisão do admin), só ao tema claro/escuro.

**Conjunto "Retos" (padrão):**
```
--radius-sm: 0px;
--radius-md: 0px;
--radius-lg: 0px;
--radius-xl: 0px;
--radius-full: 9999px; /* uso funcional: avatares, indicadores — nunca muda, não é decorativo */
```

**Conjunto "Arredondados":**
```
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 14px;
--radius-xl: 20px;
--radius-full: 9999px;
```

---

## 6. Espaçamento

Sistema baseado em múltiplos de 4px. Usar sempre valores desta escala — nunca valores arbitrários.

```
4px — micro (separações internas mínimas)
8px — pequeno (padding interno de badges, gap entre ícone e texto)
12px — compacto (padding de inputs pequenos)
16px — padrão (padding de inputs, gap entre elementos)
20px — médio (padding de cards)
24px — grande (padding de seções, gap entre cards)
32px — extra (margens de página, separações entre blocos)
48px — amplo (espaçamentos de telas grandes)
```

---

## 7. Componentes — especificações

### Botão primário
- Fundo: `--accent`
- Texto: `#111111` (sempre escuro, para contraste com o verde neon)
- Hover: `--accent-hover`
- Border radius: `--radius-sm`
- Padding: 10px 20px
- Peso: 600
- Tamanho do texto: 14px

### Botão secundário
- Fundo: `--bg-tertiary`
- Texto: `--text-primary`
- Borda: `1px solid var(--border-default)`
- Hover: aumentar opacidade da borda

### Botão destrutivo
- Fundo: `--error`
- Texto: branco

### Input
- Fundo: `--bg-secondary`
- Borda: `1px solid var(--border-default)`
- Foco: borda muda para `--accent`, sem outline padrão do browser
- Border radius: `--radius-sm`
- Padding: 10px 14px
- Texto: 14px, `--text-primary`
- Placeholder: `--text-disabled`

### Campo Inteligente (Smart Field) — implementado
Usado em formulários de dado pessoal (Checkout, Cadastro, Perfil): mesma base do Input acima, com dois complementos:
- **Ícone identificador**, à esquerda, sempre discreto: `--text-disabled`, nunca `--accent` nem outra cor de destaque — o ícone identifica o campo (telefone, e-mail, calendário etc.), não chama atenção.
- **Confirmação de preenchimento válido**, à direita: ícone de check (`CheckCircle2`), `--accent`, aparece com transição suave (nunca abrupta) assim que o valor digitado passa a ser válido — calculado em tempo real a cada tecla, não só ao sair do campo ou submeter.
- Entrada de dados sempre tolerante (Lei de Postel — ver TPS seção 1): campos com máscara (telefone, data) aceitam o usuário digitando só números, sem exigir barra/traço/espaço na posição certa — a formatação e validação são responsabilidade do sistema.
- Nunca usar seletor nativo do navegador (`<input type="date">` / `type="time">` / `type="datetime-local">`) para data ou hora — comportamento inconsistente entre navegadores mobile, historicamente causou bug de campo não abrindo. Usar sempre entrada manual com máscara (texto formatado enquanto digita), convertida para o formato ISO que o sistema já espera.

### Card
- Fundo: `--bg-secondary`
- Borda: `1px solid var(--border-subtle)`
- Border radius: `--radius-md`
- Sombra: `--shadow-sm`
- Padding interno: 20px

### Badge / Status
- Border radius: `--radius-full`
- Padding: 3px 10px
- Tamanho: Micro (11px), peso 500
- Cores por status:
  - Pago/Ativo: fundo `var(--accent-muted)`, texto `var(--accent-text)`
  - Pendente: fundo `var(--warning-muted)`, texto `var(--warning-text)`
  - Cancelado/Erro: fundo `var(--error-muted)`, texto `var(--error-text)`

**Novas variáveis necessárias (adicionar ao conjunto de cores, light e dark — mesmo padrão já usado em `--accent-muted`/`--accent-text`):**

Light:
```
--warning-muted: #FFF3E0;
--warning-text: #E65100;
--error-muted: #FFEBEE;
--error-text: #C62828;
```

Dark:
```
--warning-muted: #3D2A0A;
--warning-text: #FFB74D;
--error-muted: #3D0A0A;
--error-text: #FF6B6B;
```

Nunca usar `var(--warning)` ou `var(--error)` (as cores sólidas/saturadas) como fundo de badge com texto por cima — são para ícones, bordas e indicadores, não para fundo com texto, sob risco de repetir o bug do texto invisível.
  - Neutro: fundo `--bg-tertiary`, texto `--text-secondary`

### Sidebar do admin
- Largura: 240px (desktop), recolhível em mobile
- Fundo: `--bg-secondary`
- Borda direita: `1px solid var(--border-subtle)`
- Item ativo: fundo `--accent-muted`, texto `--accent-text`, borda esquerda `3px solid var(--accent)`
- Item hover: fundo `--bg-tertiary`
- Ícones: 18px, alinhados com o texto
- Padding do item: 10px 16px
- Logo no topo: 56px de altura reservada

---

## 8. Ícones

Usar biblioteca **Lucide Icons** (já incluída no Lovable por padrão). Tamanho padrão: 18px para UI, 16px para ícones inline com texto, 24px para destaques.

Cor dos ícones: sempre herdar do contexto (`currentColor`), nunca fixar cor no ícone.

---

### Painel lateral (Sheet) — modal expandido

Usado para formulários com múltiplas etapas que não cabem confortavelmente em um modal centralizado pequeno (ex: lançamento de venda manual). Substitui o modal centralizado nesses casos.

- Abre a partir da borda direita da tela, expandindo para a esquerda.
- Fecha colapsando de volta para a direita.
- Transição suave (~300ms).
- Largura: proporcional ao conteúdo, tipicamente 420–480px; pode chegar a 560px se o conteúdo exigir.
- Fundo: `--bg-primary`, sombra `--shadow-lg` na borda esquerda.
- Cabeçalho fixo: título + botão fechar (X).
- **Barra de progresso** logo abaixo do cabeçalho, quando o conteúdo tiver etapas (steps): linha fina, preenchimento var(--accent), com labels das etapas abaixo (ex: "1. Cliente", "2. Ingressos", "3. Confirmar") — etapa atual em var(--text-primary), demais em var(--text-secondary).
- Rodapé fixo com ações (Cancelar / Voltar / Continuar / Confirmar).
- Overlay escurecido atrás do painel (clique fora fecha, com confirmação se houver dados preenchidos).

**Quando usar modal centralizado simples vs. painel lateral com steps:** modal centralizado pequeno para ação única, sem etapas (confirmação, ver QR Code, formulário de 1 tela). Painel lateral com steps para fluxos de 2+ etapas ou formulários mais densos que um modal pequeno comportaria bem.

---

## 9. Temas de cor — implementado

Os quatro temas abaixo já estão implementados e seguem exatamente a mesma estrutura de variáveis — só os valores de `--accent`, `--accent-hover`, `--accent-muted` e `--accent-text` mudam. A escolha é feita pelo admin em Configurações → Design, salva em `organizations.accent_color`, e vale para o admin, páginas públicas do evento e Área do Cliente daquela organização — nunca é uma preferência individual salva no navegador de cada visitante.

| Tema | `--accent` | `--accent-hover` |
|---|---|---|
| Verde (padrão) | `#00E676` | `#00C853` |
| Azul neon | `#00B0FF` | `#0091EA` |
| Roxo neon | `#D500F9` | `#AA00FF` |
| Vermelho neon | `#FF1744` | `#D50000` |

---

## 10. Regras gerais

- **Nunca** usar valores de cor fixos no código — sempre variáveis CSS.
- **Nunca** misturar tamanhos de fonte fora da escala tipográfica.
- **Nunca** usar espaçamentos fora dos múltiplos de 4px definidos.
- Toda tela deve funcionar em **mobile primeiro** — especialmente a área pública (compra de ingressos).
- O verde neon (`--accent`) é a única cor expressiva do sistema. Usar com parcimônia — apenas em ações primárias, estados ativos e indicadores de sucesso.
- Textos sobre fundo `--accent` devem ser sempre escuros (`#111111`), nunca brancos.

---

## 11. Padrões de tela repetidos (fonte única de verdade)

Estes padrões devem ser reaproveitados como componentes compartilhados — nunca recriados do zero em cada tela nova. Divergência aqui já causou retrabalho (tabela de Cortesias, cards de Vendas) e deve parar de acontecer.

### Cabeçalho de listagem
- Título da área (heading-1) à esquerda.
- Botão de ação principal à direita, mesma linha.
- Botão de ação principal: sempre texto curto no padrão "+ [Nome no singular]" (ex: "+ Nova Venda", "+ Nova Cortesia", "+ Novo Cliente", "+ Novo Evento", "+ Convidar Usuário") — nunca frases longas tipo "Lançar venda manual".
- Mesmo tamanho de botão em todas as telas: padding 10px 20px, texto 14px/peso 600 (spec do Botão primário da seção 7) — largura variando só pelo texto, nunca a altura ou o padding.

### Mini dashboard de área (Vendas, Cortesias, Clientes, Remarketing)
- Cards compactos, menores que os do Dashboard principal — mesmo componente reaproveitado entre áreas, variando só o conteúdo.
- Mesma altura entre os cards de uma mesma linha.
- Ícone + valor principal (heading-1) + label (small) — sem elementos extras que aumentem a altura sem necessidade.

### Barra de filtros
- Desktop: abas de origem/tipo (quando existirem) à esquerda, dropdowns/busca à direita, mesma linha.
- Mesmo espaçamento entre os filtros em todas as áreas.
- **Mobile — nunca empilhar tudo em uma coluna única quando sobrar espaço lateral.** Regra: agrupar elementos de filtro compatíveis (dropdown de evento, campo de busca, dropdowns de status/origem) em pares lado a lado (grid de 2 colunas), na ordem em que aparecem. Botões de ação que fazem mais sentido sozinhos (ex: "Gerar lista PDF", "Exportar CSV") ocupam a largura total, numa linha própria abaixo dos pares. Aplicar esse padrão em toda área com barra de filtros (Vendas, Cortesias, Clientes, Remarketing, Usuários) — não só onde o problema foi identificado visualmente.

### Tabela de listagem
- Componente único e compartilhado — nunca reimplementado por tela.
- **Cabeçalho da tabela (linha com os nomes das colunas):** fundo visualmente diferenciado do corpo da tabela — usar `var(--bg-tertiary)` em vez de `var(--bg-secondary)`. No tema light isso resulta num tom mais escuro (correto); no tema dark, `--bg-tertiary` é mais claro que `--bg-secondary` (correto também — em fundo escuro, "elevar"/clarear é o que gera a mesma sensação de distinção que escurecer geraria no light. Nunca escurecer ainda mais um fundo já escuro).
- Mesmo tamanho e peso de fonte em cabeçalho e linhas.
- Mesmo estilo de badge (status, origem, etc.): padding, cantos retos, tamanho de texto.
- Mesma altura de linha, mesmo espaçamento interno de célula.
- Linha em altura única — nunca quebrar texto/badge (truncate + tooltip quando necessário).
- Mesmo componente e posição de paginação no rodapé (seletor 10/25/50/100, indicador "Mostrando X–Y de Z").

### Estado "selecionado/ativo" (regra global — aplica a qualquer componente)
- Nunca usar fundo branco/claro sólido fixo para indicar seleção (bug identificado no menu lateral em tema dark, mas a regra vale para todo componente com estado ativo/selecionado: abas, filtros, toggles, itens de menu).
- Sempre usar `var(--accent-muted)` como fundo do estado selecionado — essa variável já é definida por tema de cor (verde/azul/roxo/vermelho) e por modo (light/dark), então o estado selecionado herda automaticamente a cor de destaque ativa, sem precisar de lógica extra.
- Texto/ícone do item selecionado: `var(--accent-text)`.

### Painel lateral (Sheet)
- Ver especificação completa na seção 8. Sempre que uma tela precisar de formulário maior que um modal simples, reaproveitar este componente — não criar variação nova de modal.
- **Implementação de referência:** componente único `SidePanel` (cabeçalho fixo, conteúdo central rolável, rodapé de ações sempre fixo e visível). Todo painel lateral do sistema deve ser construído em cima dele — usar o Sheet genérico do shadcn direto, sem essa estrutura, já causou um bug real (painel sem rolagem no celular, botão de ação inacessível).

### Vitrine (banner da tela inicial do cliente)
- Imagem em proporção fixa 4:5 (1080×1350px, mesmo padrão de post do Instagram), até 3MB.
- **Preenchimento do espaço disponível (implementado):** a área da imagem ocupa exatamente o espaço vertical que sobra entre o cabeçalho e o menu inferior (`flex-1` sobre a altura real da tela, nunca um valor fixo em `vh` "chutado") — nunca sobra vazio, nunca precisa de rolagem para ver banner + botão juntos. Rolagem só existe a partir do texto auxiliar do banner (quando cadastrado), que fica abaixo do botão.
- Imagem **nunca cortada** — encaixe por conter (object-contain). A imagem ocupa 100% da largura do card, encostando nas bordas — sem respiro/moldura artificial ao redor. Quando a imagem enviada não for exatamente 4:5, o espaço sobrando é preenchido com `--bg-tertiary` (nunca `--bg-secondary` do card, para a sobra parecer intencional, não um erro de layout).
- Cartão inteiro (imagem + botão) dentro de um único container com `overflow-hidden` e `--radius-md` — o botão "Acessar" nunca tem raio próprio; herda o arredondamento do container pai, garantindo que o canto inferior do card sempre acompanhe o canto superior (bug já corrigido: botão quadrado destoando do resto do card arredondado).
- Botão de ação abaixo da imagem (nunca sobreposto a ela), rótulo "Acessar", mesmo tratamento visual do botão principal do Checkout.
- Regra "um banner ativo por vez" garantida por trigger no banco, não por lógica de tela.
- Banner sem link de destino cadastrado nunca é exibido (mesmo com imagem e ativo) — comportamento intencional, não bug: sem link não haveria para onde o botão "Acessar" levaria.

### Skeleton Screen (carregamento pós-login) — implementado
Substituiu o modelo anterior de splash em tela cheia com logo. Ver TPS seção 13.3 para o comportamento completo — resumo aqui: blocos cinza pulsantes no formato aproximado da tela de destino, exibidos por no máximo 400ms (Limiar de Doherty), nunca controlados pelo tempo real de carregamento dos dados.

### Legenda de status por cor (bolinha)
- Usada quando o status é representado só por cor (sem texto na célula, como em Remarketing).
- Sempre posicionada por fora do card/tabela, acima dele, alinhada à direita — nunca dentro de um cabeçalho de coluna.

### Botões de ação por linha (tabela)
- Ações de ícone único (ex: abrir WhatsApp, copiar, ver QR Code): sem texto, com tooltip.
- Ações destrutivas (remover, cancelar): sempre com modal de confirmação antes de executar.

### Botão fixo no rodapé (mobile)
- Usado em telas do MobileLayout com ação principal única (ex: "Comprar agora" na página do evento, "Gerar Pix" no checkout).
- O container de conteúdo rolável ACIMA do botão precisa reservar espaço equivalente à altura do botão fixo (padding-bottom no conteúdo, não só no container geral) — senão o último elemento da tela fica escondido atrás do botão (bug já identificado na página pública do evento).
- Regra prática: `padding-bottom` do conteúdo = altura do botão fixo + espaçamento de respiro (ex: 16–24px) + área segura do dispositivo (safe-area-inset-bottom, para iPhones com barra inferior).
