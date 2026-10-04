# TicketFlow — CHANGELOG

Registro cronológico de mudanças reais no projeto. **Mais recente no topo.**

**Reiniciado em 01/10/2026.** O changelog anterior parou de ser atualizado em
julho/2026 — mais de 460 commits depois ficaram sem registro, por agentes
diferentes trabalhando sem anotar. Reconstruir esse histórico perdido viraria
arqueologia de git, então não tentamos: o conteúdo antigo continua disponível
em `docs/CHANGELOG-ARQUIVO-ATE-2026-07.md`, e o histórico completo sempre
pode ser consultado em `git log`. **Daqui pra frente, toda mudança relevante
entra aqui — ver regra em `CLAUDE.md`.**

**Como registrar uma entrada nova:** data, categoria (🐛 correção /
🔒 segurança / ✨ funcionalidade / 🎨 design / 📝 documentação), descrição
em 1 linha, hash do commit entre parênteses. Adicionar sempre no topo.

---

## 04/10/2026 — Agente Claude 2

- 🔧 **Endereço de reserva do Mercado Pago apontava para o Lovable (fora
  do ar)**: usado só quando falta a variável `VITE_SITE_URL`; trocado
  para `https://ticketflow-core.vercel.app`. Como a Vercel já tem essa
  variável configurada, não muda nada na prática hoje — é uma rede de
  segurança para o caso de faltar. (`3bf4635`)
- 📝 Confirmado: painel do Mercado Pago com webhook já apontando para a
  Vercel; Supabase → Authentication → URL Configuration com Site URL e
  Redirect URLs só da Vercel (removidas as referências ao Lovable).

## 01/10/2026 — Agente 01 (Claude)

- 🎨 **Logo unificado** entre sidebar do Admin, header do Cliente, Login,
  Cadastro e telas de senha — existiam 4 versões visuais diferentes do
  mesmo logo; criado componente único `Brandmark`. De quebra, corrigiu um
  bug de texto invisível no tema claro do Cadastro. (`ee82b07`)
- 🐛 **Módulo Usuários inacessível**: a tela sempre redirecionava para
  Vendas, até para administradores reais — a checagem de permissão
  dependia de um dado nunca preenchido pelo sistema. (`42d9423`)
- 🐛 **Botão "Remover" não cancelava convite pendente**: funcionava só
  para quem já tinha conta; convite pendente ficava órfão mesmo com a
  mensagem de sucesso. Criada função `remove_user_or_invite`. (`42d9423`)
- 🐛 **Assistente do Mercado Pago inacessível**: mesmo bug de permissão
  do item acima, numa tela ainda mais crítica — sem abrir, não dava para
  configurar o Pix de jeito nenhum. (`2507b52`)
- 🔒 **Falha de segurança no salvamento de credenciais do Mercado Pago**:
  as funções de servidor não conferiam quem estava chamando — qualquer
  pessoa que descobrisse o endereço poderia trocar as credenciais de
  pagamento de qualquer organização. Corrigido com checagem de admin.
  (`2507b52`)
- 🐛 **Salvar só o webhook secret apagava o Access Token** já salvo (e
  vice-versa) por sobrescrita sem preservar o que não foi reenviado.
  Correção convergiu com um fix equivalente aplicado em paralelo por
  outro agente. (`66a7e43`)
- 🐛 **Botão "Criar PIX de teste" nunca funcionava**: tentava inserir
  direto na tabela `sales`, bloqueado por regra de segurança do banco,
  com um evento/lote inventado que não existe. Criada função
  `create_mp_test_sale`, usando um evento real da organização. (`66a7e43`)
- 📝 Registrada a causa raiz de fundo do problema do Pix: Lovable e
  Vercel guardam a chave de criptografia (`APP_ENCRYPTION_KEY`) em
  variáveis de ambiente separadas — credencial salva numa plataforma não
  descriptografa na outra. Ação pendente, fora do repositório: igualar a
  variável nas duas plataformas ou definir uma só como produção.
  (`6460526`)
- 🐛 **Duas versões de funções do banco coexistindo** (`create_locked_tickets`,
  `create_pending_sale`, `update_customer`) — o sistema estava resolvendo
  chamadas para a versão antiga e já corrigida, reativando bugs já dados
  como resolvidos. Risco real: ingresso duplicado em reenvio de webhook,
  e venda sem login nunca vinculava ao cliente. Removidas as versões
  antigas; criado snapshot de todas as funções do banco como backup
  versionado (não existia controle de versão de várias delas).
- 🎨 Auditoria de aderência ao Design System: achado que o documento
  oficial descreve o tema verde antigo (v1.1) enquanto o código já roda
  o tema roxo (v1.2) — raiz de parte da sensação de inconsistência visual.
  Ver `docs/DESIGN-SYSTEM.md` para o status da correção do documento.
- 📝 Criado `CLAUDE.md` (índice de rotas) — na verdade já existia, criado
  por outro agente em paralelo; só foi complementado.
