# Plano de Implementação - Checklist do Evento

Adição da ferramenta de Checklist ao Hub de Ferramentas e criação da página de gerenciamento de tarefas do dia do evento.

## 1. Hub de Ferramentas (`/admin/ferramentas`)
- [ ] Atualizar `src/routes/admin.ferramentas.index.tsx` para incluir o card "Checklist do Evento".
- [ ] Ícone: `CheckSquare` (Lucide).
- [ ] Descrição: "Organize as tarefas do dia do evento para não esquecer nada".
- [ ] Destino: `/admin/checklist`.

## 2. Roteamento e Página
- [ ] Criar `src/routes/admin.checklist.tsx` (definição da rota).
- [ ] Criar `src/pages/admin/ChecklistPage.tsx` (componente da página).

## 3. Funcionalidades da Página de Checklist
- [ ] **Cabeçalho**: Título "Checklist do Evento" (heading-1) + Botão "+ Nova Tarefa" (`PrimaryActionButton`).
- [ ] **Mini Dashboard**:
  - Card 1: "Total de Tarefas" (ícone `ClipboardList`).
  - Card 2: "Concluídas" (ícone `CheckCircle`, exibe "X de Y" e barra de progresso).
- [ ] **Lista de Tarefas**:
  - Exibição de tarefas em cards ou linhas de tabela simplificadas.
  - Checkbox para marcar como concluída (com efeito visual de risco no texto).
  - Texto da tarefa (heading-3).
  - Botão de remover (ícone `Trash2`).
- [ ] **Painel Lateral (`SidePanel`)**:
  - Formulário simples para adicionar tarefa.
  - Suporte a adicionar via tecla "Enter" mantendo o foco.
- [ ] **Dados Mockados**: Lista inicial com 8 tarefas (ex: "Checar som", "Validar ingressos", "Briefing equipe", etc.), sendo 3 concluídas.

## 4. Padrões Visuais (Design System)
- [ ] Cantos retos (0px).
- [ ] Tipografia Geist.
- [ ] Temas Light e Dark suportados.
- [ ] Uso de componentes compartilhados: `SidePanel`, `PrimaryActionButton`, `MiniMetricCard`, `MiniMetricGrid`.
