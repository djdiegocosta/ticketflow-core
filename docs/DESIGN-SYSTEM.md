# TicketFlow — Design System
**Versão:** 1.0 — Julho/2026
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
> **Atualização (padrão vigente):** cantos retos em todo o sistema — cards, botões, inputs, modais. Só `--radius-full` permanece (uso funcional: avatares, indicadores, não decorativo). Caso essa decisão mude no futuro, este documento será atualizado.

--radius-sm: 0px;    /* inputs, badges, tags */
--radius-md: 0px;   /* cards, dropdowns, modais pequenos */
--radius-lg: 0px;   /* cards maiores, painéis, modais */
--radius-xl: 0px;   /* elementos de destaque, banners */
--radius-full: 9999px; /* botões pill (se houver), avatares, indicadores — uso funcional, não decorativo */
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
  - Pago/Ativo: fundo `--accent-muted`, texto `--accent-text`
  - Pendente: fundo `#FFF3E0`, texto `#E65100`
  - Cancelado/Erro: fundo `#FFEBEE`, texto `#C62828`
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



Quando implementados, seguem exatamente a mesma estrutura de variáveis — só os valores de `--accent`, `--accent-hover`, `--accent-muted` e `--accent-text` mudam.

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
