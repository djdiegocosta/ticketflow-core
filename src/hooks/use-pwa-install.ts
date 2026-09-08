import { useCallback, useEffect, useState } from "react";

// Evento não-padrão do navegador (Chrome/Edge/Android) — não faz parte do
// lib.dom.d.ts do TypeScript, por isso a tipagem manual abaixo.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "ticketflow-install-banner-dismissed";

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIphoneOrIpad = /iphone|ipad|ipod/i.test(ua);
  // iPad com iOS 13+ se identifica como "Macintosh" no user agent, mas tem
  // suporte a toque — diferente de um Mac de verdade.
  const isIpadOS =
    /Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document;
  return isIphoneOrIpad || isIpadOS;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const matchesDisplayMode = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  // Safari/iOS expõe essa propriedade não-padrão em vez do display-mode.
  const iosStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return matchesDisplayMode || iosStandalone;
}

/**
 * Controla a exibição do botão "Instalar aplicativo" na experiência do
 * cliente. Não interfere em nada fora disso — não mexe em autenticação,
 * dados ou no Service Worker em si (esse é registrado uma única vez em
 * src/routes/__root.tsx).
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  // Começa "dispensado" até a checagem no cliente terminar — evita mostrar o
  // botão por um instante e sumir em seguida (pior que só aparecer depois).
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    setIsStandalone(detectStandalone());
    setIsIOS(detectIOS());

    try {
      setIsDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setIsDismissed(false);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Silencioso — localStorage pode não estar disponível (modo privado, etc.)
    }
  }, []);

  // Android/Chrome: o navegador já avisou que pode instalar programaticamente.
  const canInstallDirectly = Boolean(deferredPrompt);
  // iOS/Safari: nunca existe evento nativo — a única forma é a instrução manual.
  const canShowIOSInstructions = isIOS && !isStandalone;

  const shouldShow =
    !isStandalone && !isDismissed && (canInstallDirectly || canShowIOSInstructions);

  return {
    isStandalone,
    isIOS,
    canInstallDirectly,
    canShowIOSInstructions,
    shouldShow,
    promptInstall,
    dismiss,
  };
}
