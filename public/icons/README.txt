TicketFlow — pacote de ícones

Conceito: ingresso verde inclinado, com fileira de pontos vazados no centro.

Cor:
- Verde: #00E676
Sem gradientes, sombras ou segunda cor. Os pontos são vazados (mostram o fundo).

Arquivos (todos gerados a partir de ticketflow-icon.svg):
- ticketflow-icon.svg — matriz vetorial
- icon-1024x1024.png — master/app (fundo transparente)
- icon-512x512.png — PWA (fundo transparente)
- icon-192x192.png — PWA (fundo transparente)
- apple-touch-icon.png — 180x180, fundo cinza-escuro #383B43 (o iOS não aceita transparência)
- favicon.ico — 16/32/48/64 (também em public/favicon.ico, com 128 e 256)
- favicon-16.png / favicon-32.png / favicon-64.png — prévias

O logo dentro do sistema (menu, login) NÃO usa estes arquivos: é o componente
src/components/Brandmark.tsx, que acompanha a cor do tema.
