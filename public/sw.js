// Service Worker mínimo — habilita a instalação do PWA (Adicionar à Tela de
// Início / botão "Instalar app"), sem cache de arquivos.
//
// Importante: este arquivo NÃO tem listener de 'fetch'. Isso é intencional —
// significa que ele nunca intercepta nem armazena nenhuma resposta de rede,
// então não existe risco de servir uma versão antiga do site depois de um
// novo deploy (o bug que motivou desligar o SW anteriormente, em 29/08/2026).
//
// skipWaiting + clients.claim: se algum navegador ainda tiver uma versão
// antiga deste Service Worker instalada, esta nova versão assume o controle
// imediatamente, sem esperar todas as abas do site fecharem.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
