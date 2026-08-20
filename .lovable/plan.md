# Plano de Integração de Design e Persistência no Supabase

Este plano detalha a transição do armazenamento de design (cores e cantos) do `localStorage` para a tabela `organizations` no Supabase, garantindo a aplicação correta em áreas administrativas e públicas.

## Tarefas Técnicas

### 1. Extensão de Queries e Mutations (`src/lib/settings-queries.ts`)
- Implementar `useUpdateDesignSettings` para atualizar `accent_color` e `corner_style` na tabela `organizations`.
- Garantir invalidação da query `["organization"]` após o sucesso.

### 2. Sincronização de Estado Global (`src/lib/design.tsx`)
- Modificar o `DesignProvider` para:
  - Consumir dados de `useOrganization()` quando autenticado.
  - Priorizar valores do banco de dados sobre o `localStorage`.
  - Manter o `localStorage` como fallback/cache imediato.
  - Atualizar o banco de dados via mutation ao disparar `setAccent` ou `setRadius`.

### 3. Persistência na UI de Configurações (`src/pages/admin/SettingsPage.tsx`)
- Conectar os seletores de design da `SettingsPage` à mutation `useUpdateDesignSettings`.
- Garantir que a alteração seja refletida tanto visualmente quanto no banco.

### 4. Design Público (`src/lib/customer-queries.ts` e Páginas Públicas)
- Criar hook `usePublicOrgDesign` que chama a RPC `get_public_organization_design`.
- Implementar a aplicação de estilos via CSS Variables nas páginas públicas:
  - `PublicEventPage.tsx`
  - `CheckoutPage.tsx`
  - `ConfirmationPage.tsx`
- Utilizar os mapeamentos `ACCENT_COLORS` e `CORNER_STYLES` de `src/lib/design.tsx` para consistência.

## Detalhes Técnicos
- **RPC:** `get_public_organization_design(slug)` retorna o design mesmo sem autenticação.
- **CSS Variables:** As variáveis `--accent`, `--accent-hover`, `--accent-muted`, `--accent-text` e `--radius-*` serão injetadas dinamicamente no `document.documentElement` conforme a organização.
- **Performance:** Uso de `localStorage` como cache para evitar flash de estilo padrão antes do carregamento dos dados da organização.
