# Plano de Correção de Redirecionamento

O sistema apresenta redirecionamentos indevidos para `/admin` ao tentar acessar rotas internas (como Eventos, Configurações, etc.) devido a guardas de rota (`beforeLoad`) legados que tentam ler um estado de autenticação mockado do `localStorage` (`ticketflow_auth`), que não é mais utilizado após a migração para Supabase.

## Rotas Definidas e Comportamento Esperado

| Rota | Destino/Componente | Acesso |
| :--- | :--- | :--- |
| `/admin` | `AdminDashboard` | Admin, Colaborador (redireciona para `/admin/vendas`) |
| `/admin/eventos` | `EventsListPage` | Admin |
| `/admin/vendas` | `SalesListPage` | Admin, Colaborador |
| `/admin/cortesias` | `CourtesiesListPage` | Admin |
| `/admin/clientes` | `ClientsListPage` | Admin |
| `/admin/usuarios` | `UsersListPage` | Admin apenas |
| `/admin/configuracoes` | `SettingsPage` | Admin |
| `/admin/ferramentas` | `ToolsHubPage` | Admin |
| `/admin/simulador` | `SimuladorPage` | Admin |
| `/admin/remarketing` | `RemarketingPage` | Admin |
| `/admin/sorteios` | `Placeholder` | Admin |
| `/admin/checklist` | `ChecklistPage` | Admin |
| `/admin/financeiro` | `Placeholder` | Admin |
| `/admin/relatorios` | `Placeholder` | Admin |
| `/admin/importacao` | `Placeholder` | Admin |

## Ações Técnicas

1. **Remover Guardas Legados**: Eliminar os blocos `beforeLoad` nas rotas filhas de `/admin` que referenciam `localStorage.getItem('ticketflow_auth')`. A rota pai `/admin.route.tsx` já garante a sessão e o papel do usuário via Supabase.
2. **Centralizar Proteção de Papéis**: Garantir que a lógica de permissão de `colaborador` (que só pode acessar Vendas e Check-in) seja tratada de forma consistente, preferencialmente na rota pai ou validando o contexto injetado.
3. **Corrigir Loop de Login**: Ajustar a rota `/login` para garantir que o redirecionamento pós-login considere o estado real do Supabase e não cause loops.

## Critérios de Conclusão

- Navegação entre abas do admin funciona sem redirecionar para a home.
- F5 em qualquer rota mantém a página.
- Logout e Login funcionam perfeitamente sem loops.
