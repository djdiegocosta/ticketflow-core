# Plano: Atualização de Relatório de Correções

O usuário solicitou uma edição de texto na raiz do projeto (`src/routes/index.tsx`), mas o arquivo atual apenas redireciona para o login e não contém o texto citado. O texto solicitado parece ser um relatório de status ou documentação que deve ser exibido na página inicial (possivelmente para fins de QA ou visibilidade do progresso do "Gauntlet AAA").

## Alterações Propostas

### Frontend
- **src/routes/index.tsx**: 
    - Remover o redirecionamento automático no `beforeLoad`.
    - Implementar um componente básico que renderiza o relatório solicitado em Markdown ou HTML simples para que ele seja visível na página inicial conforme o pedido.

## Detalhes Técnicos
- O texto fornecido pelo usuário é um bloco de Markdown que descreve o "Relatório de Correções por Fluxo".
- Vou converter este texto em JSX dentro do componente da rota index.
