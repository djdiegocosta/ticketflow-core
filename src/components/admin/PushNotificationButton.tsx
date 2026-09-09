import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
  sendPushTest,
} from "@/lib/push.functions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // O padding do base64 precisa ser calculado, não fixo — chaves VAPID
  // reais quase nunca precisam de exatamente "==". Somar um padding fixo
  // (como estava antes) gera uma string de tamanho inválido e o atob()
  // lança "The string to be decoded is not correctly encoded" para toda
  // chave, mesmo as corretas.
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

function isPushSupported() {
  return typeof window !== "undefined"
    && "Notification" in window
    && "serviceWorker" in navigator
    && "PushManager" in window;
}

export function PushNotificationButton() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    setSupported(true);
    navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      setEnabled(Boolean(subscription) && Notification.permission === "granted");
    }).catch(() => undefined);
  }, []);

  const enable = async () => {
    if (!isPushSupported()) {
      toast.error("Este navegador não oferece notificações push para o TicketFlow.");
      return;
    }

    setBusy(true);
    try {
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();

      if (permission !== "granted") {
        toast.error("Permissão para notificações não concedida.");
        return;
      }

      const publicKey = await getVapidPublicKey();
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await savePushSubscription({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")!))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("auth")!))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
        },
        userAgent: navigator.userAgent,
      });

      setEnabled(true);
      toast.success("Notificações ativadas.");
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível ativar as notificações.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setEnabled(false);
      toast.success("Notificações desativadas neste dispositivo.");
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível desativar as notificações.");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      const result = await sendPushTest();
      if (!result.success) throw new Error("Nenhuma assinatura ativa foi encontrada.");
      toast.success("Notificação de teste enviada.");
    } catch (error: any) {
      toast.error(error?.message || "Falha ao enviar o teste.");
    } finally {
      setBusy(false);
    }
  };

  if (!supported) return null;

  return (
    <div className="flex items-center gap-1">
      {enabled ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Enviar notificação de teste"
            onClick={test}
            disabled={busy}
            className="text-[var(--text-secondary)]"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bell className="h-5 w-5" />}
          </Button>
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="hidden text-micro text-[var(--text-disabled)] hover:text-[var(--text-secondary)] md:block"
            title="Desativar notificações"
          >
            Desativar
          </button>
        </>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Ativar notificações"
          onClick={enable}
          disabled={busy}
          className="text-[var(--text-secondary)]"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <BellOff className="h-5 w-5" />}
        </Button>
      )}
    </div>
  );
}
