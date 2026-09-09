// Service Worker mínimo — habilita a instalação do PWA e Web Push.
//
// Importante: este arquivo NÃO tem listener de 'fetch'. Isso é intencional —
// ele nunca intercepta nem armazena respostas de rede, evitando o bug de
// cache que anteriormente fazia o app servir versões antigas após deploy.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text?.() || "Nova atualização no TicketFlow." };
  }

  const title = payload.title || "TicketFlow";
  const options = {
    body: payload.body || "Você recebeu uma nova atualização.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: payload.tag || "ticketflow-notification",
    renotify: true,
    data: { url: payload.url || "/admin" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/admin", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
