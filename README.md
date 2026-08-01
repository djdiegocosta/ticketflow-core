# TicketFlow Core

Você vai construir o TicketFlow do zero. Este é o Prompt 01 — ele cria apenas a fundação técnica e visual do projeto. Nenhuma tela funcional ainda.

## Documentação oficial

O projeto possui dois documentos de referência que devem ser respeitados em todo desenvolvimento futuro:

- TPS.md — especificação de todas as telas e regras de negócio

- DESIGN-SYSTEM.md — paleta, tipografia, espaçamentos e componentes

Crie a pasta /docs no projeto e adicione os dois arquivos. O conteúdo será fornecido separadamente.

## Stack

- React + Vite + TypeScript

- Tailwind CSS + shadcn/ui

- React Router (roteamento client-side)

- TanStack Query (gerenciamento de dados)

- Supabase (configurado mas sem conexão ativa ainda — deixar cliente preparado com variáveis de ambiente vazias)

- Lucide Icons

## Design System — implementar agora

### Fonte

Instalar e configurar a fonte Geist (Google Fonts). Aplicar como fonte padrão global:

- Geist Sans → texto e UI

- Geist Mono → códigos, IDs, valores técnicos

### Variáveis CSS

Criar em src/index.css todas as variáveis abaixo. NUNCA usar valores de cor fixos no código — sempre variáveis.

Tema Light (padrão, classe :root):

--bg-primary: #FFFFFF

--bg-secondary: #F5F5F7

--bg-tertiary: #E8E8ED

--text-primary: #1D1D1F

--text-secondary: #6E6E73

--text-disabled: #AEAEB2

--border-default: #D2D2D7

--border-subtle: #E8E8ED

--accent: #00E676

--accent-hover: #00C853

--accent-muted: #E8FFF4

--accent-text: #00A844

--error: #FF3B30

--warning: #FF9500

--success: #00E676

--info: #0A84FF

--shadow-sm: 0 1px 3px rgba(0,0,0,0.08)

--shadow-md: 0 4px 12px rgba(0,0,0,0.10)

--shadow-lg: 0 8px 24px rgba(0,0,0,0.12)

Tema Dark (classe .dark):

--bg-primary: #111111

--bg-secondary: #1C1C1E

--bg-tertiary: #2C2C2E

--text-primary: #F5F5F7

--text-secondary: #8E8E93

--text-disabled: #48484A

--border-default: #3A3A3C

--border-subtle: #2C2C2E

--accent: #00E676

--accent-hover: #00C853

--accent-muted: #0D2A1A

--accent-text: #00E676

--error: #FF453A

--warning: #FF9F0A

--success: #00E676

--info: #0A84FF

--shadow-sm: 0 1px 3px rgba(0,0,0,0.30)

--shadow-md: 0 4px 12px rgba(0,0,0,0.40)

--shadow-lg: 0 8px 24px rgba(0,0,0,0.50)

### Escala tipográfica (aplicar via classes Tailwind customizadas)

- display: 32px / weight 700

- heading-1: 24px / weight 600

- heading-2: 18px / weight 600

- body: 14px / weight 400

- small: 12px / weight 400

- micro: 11px / weight 500

- mono: 13px / weight 400 / font-mono

### Border radius (variáveis CSS)

--radius-sm: 6px

--radius-md: 10px

--radius-lg: 14px

--radius-xl: 20px

--radius-full: 9999px

### Espaçamento

Sistema baseado em múltiplos de 4px. Configurar no tailwind.config.ts para garantir uso consistente.

## Roteamento base

Criar a estrutura de rotas abaixo, todas apontando para páginas placeholder (só um título centralizado indicando qual tela é):

Rotas públicas:

- / → redireciona para /login

- /login

- /cadastro

- /recuperar-senha

- /redefinir-senha

- /e/:slug → PlaceholderEventPage

- /e/:slug/checkout → PlaceholderCheckout

- /e/:slug/confirmacao/:sale_code → PlaceholderConfirmacao

- /meus-ingressos → PlaceholderMeusIngressos

- /ingresso/:ticket_code → PlaceholderIngresso

Rotas do cliente (layout próprio, futuro guard de auth):

- /cliente → PlaceholderClienteDashboard

- /cliente/ingressos → PlaceholderClienteIngressos

- /cliente/perfil → PlaceholderClientePerfil

- /cliente/pontos → PlaceholderClientePontos

Rotas do admin (layout próprio, futuro guard de auth):

- /admin → PlaceholderAdminDashboard

- /admin/eventos → PlaceholderEventos

- /admin/eventos/novo → PlaceholderEventoForm

- /admin/eventos/:id → PlaceholderEventoForm

- /admin/vendas → PlaceholderVendas

- /admin/vendas/:id → PlaceholderVendaDetalhe

- /admin/cortesias → PlaceholderCortesias

- /admin/clientes → PlaceholderClientes

- /admin/clientes/:id → PlaceholderClienteFicha

- /admin/checkin → PlaceholderCheckIn

- /admin/financeiro → PlaceholderFinanceiro

- /admin/simulador → PlaceholderSimulador

- /admin/importacao → PlaceholderImportacao

- /admin/relatorios → PlaceholderRelatorios

- /admin/remarketing → PlaceholderRemarketing

- /admin/sorteios → PlaceholderSorteios

- /admin/usuarios → PlaceholderUsuarios

- /admin/configuracoes → PlaceholderConfiguracoes

Rotas do superadmin (layout próprio, futuro guard de auth):

- /superadmin → PlaceholderSuperDashboard

- /superadmin/organizacoes → PlaceholderOrganizacoes

- /superadmin/planos → PlaceholderPlanos

## Layouts base (sem conteúdo funcional ainda)

### Layout Admin

- Sidebar fixa à esquerda, 240px

- Fundo da sidebar: var(--bg-secondary)

- Borda direita: 1px solid var(--border-subtle)

- Logo "TicketFlow" no topo (texto, sem imagem por enquanto)

- Menu com todos os itens listados acima (ícones Lucide + labels)

- Item ativo: borda esquerda 3px solid var(--accent), fundo var(--accent-muted), texto var(--accent-text)

- Item hover: fundo var(--bg-tertiary)

- Header superior: nome do usuário (mockado), botão de toggle de tema (ícone sol/lua)

- Área de conteúdo principal à direita com padding 32px

- Desktop first — não precisa ser responsivo nesta etapa

### Layout Cliente

- Header simples com logo e nome do usuário

- Área de conteúdo com padding adequado para mobile

- Mobile first

### Layout Público

- Sem sidebar

- Mobile first

- Sem header fixo por enquanto

## Toggle de tema (light/dark)

Implementar troca de tema funcional desde já:

- Botão no header do admin e no perfil do cliente

- Salvar preferência no localStorage

- Aplicar classe .dark no elemento html

- Todas as variáveis CSS devem responder automaticamente à troca

## O que NÃO fazer neste prompt

- Não implementar autenticação real

- Não conectar ao Supabase

- Não criar formulários funcionais

- Não implementar lógica de negócio

- Não criar dados mockados além do nome do usuário no header

## Critério de conclusão

Ao final, o projeto deve:

1. Ter todas as rotas funcionando (navegar entre placeholders sem erro)

2. Ter o Design System aplicado globalmente (variáveis CSS, fonte Geist, tema light/dark funcionando)

3. Ter o layout do admin visível e navegável com o menu lateral completo

4. Ter o toggle de tema funcionando

5. Compilar sem erros de TypeScript

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/03b119d1-eae7-49eb-8c3d-faa86cdb1453).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
