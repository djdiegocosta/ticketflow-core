# Plano de Refatoração da Tela Inicial do Cliente

## Objetivo
Otimizar a interface inicial do cliente (mobile), ajustando a hierarquia de informações, adicionando logout e corrigindo a exibição do banner/vitrine.

## Alterações Propostas

### 1. Refatoração de `src/routes/cliente.index.tsx`
- **Remover Dashboard:** Excluir o grid de estatísticas (Eventos, Ingressos, Pontos).
- **Ajustar Saudação:** Reduzir tamanho da fonte (`text-heading-2` em vez de `text-heading-1`) e fixar em linha única: "Que bom que você chegou, {userName}!".
- **Reordenar Conteúdo:** Mover a seção "Próximos eventos" para logo abaixo da mensagem de boas-vindas.
- **Estrutura Final da Página:**
  1. Splash (se houver)
  2. Vitrine (Banner)
  3. Saudação (Linha única)
  4. Próximos Eventos
  5. Eventos Passados (se houver)

### 2. Adição de Botão de Logout
- Adicionar ícone de logout (`LogOut`) no `MobileLayout.tsx` ou diretamente no `cliente.index.tsx` (cabeçalho).
- Conectar ao método `logout` do `useAuth`.

### 3. Correção da Vitrine (`src/components/cliente/ClientVitrine.tsx`)
- **Link e Botão:** Garantir que o `banner.link_url` renderize um botão visível ou área clicável clara.
- **Diagnóstico:** Verificar por que o banner não aparece (provável RLS ou ausência de `organization_id` no contexto do cliente, embora corrigido anteriormente, validar no componente).
- **Botão de Direcionamento:** Se houver link, adicionar um botão flutuante ou expandir a área de clique conforme solicitado.

## Detalhes Técnicos
- Utilizar Tailwind para garantir cantos retos (`rounded-none`) e fonte Geist.
- Manter suporte a Dark Mode.
- Validar `organization_id` via `useAuth` para garantir isolamento.

## Passos de Verificação
1. Abrir `/cliente` e verificar se o dashboard sumiu.
2. Confirmar que "Próximos Eventos" está abaixo da saudação.
3. Testar o botão de logout.
4. Criar um banner no admin e validar sua aparição e clique no `/cliente`.
