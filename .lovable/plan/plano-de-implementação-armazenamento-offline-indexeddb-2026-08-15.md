# Plano de Implementação: Armazenamento Offline (IndexedDB)

Implementar suporte offline para o módulo de Check-in e a área "Meus Ingressos" usando IndexedDB e Service Workers, conforme a seção 13.4 do TPS.md.

## 1. Infraestrutura de Dados Offline
- Criar `src/lib/offline-db.ts` para gerenciar o IndexedDB usando a API nativa.
- Definir stores:
  - `event_tickets`: Cache de ingressos por evento (código, nome, status).
  - `checkin_sync_queue`: Fila de check-ins realizados offline.
  - `my_tickets`: Cache de ingressos do cliente para acesso offline.

## 2. Check-in Offline
- **Carregamento:** Ao selecionar um evento no `CheckinPage.tsx`, buscar ingressos mockados do `PublicDataProvider` e salvar no IndexedDB.
- **Validação:** Modificar `resolveMockCheckin` (ou criar versão offline) para consultar o IndexedDB antes de qualquer simulação.
- **Registro:** Gravar check-ins no cache local e na fila de sincronização se estiver offline.
- **Sincronização:** Implementar listener de `online` para processar a fila (`checkin_sync_queue`).
- **UI:** Adicionar ícone de status (Conectado / Offline / Pendente) no header do Check-in.

## 3. Meus Ingressos Offline
- **Persistência:** No `Page_cliente_ingressos` e na tela de detalhe do ingresso, salvar os dados visualizados no IndexedDB.
- **Fallback:** Se `navigator.onLine` for false, carregar dados do IndexedDB em vez do estado em memória/localStorage.
- **UI:** Exibir etiqueta "dados salvos localmente" quando carregado do cache.

## 4. Integração PWA
- Garantir que o Service Worker (em `public/sw.js` ou gerado pelo Vite) esteja configurado para suportar o carregamento básico da App Shell em modo offline.

## Detalhes Técnicos
- **IndexedDB:** Database `ticketflow_offline`, versão 1.
- **Sincronização:** Simulação de sucesso imediato ao "enviar" a fila quando online.
- **Status Visual:** Pequenos indicadores em `var(--accent)` ou `var(--text-secondary)`.

---
*Este plano foca na resiliência operacional sem alterar o design brutalista já estabelecido.*
