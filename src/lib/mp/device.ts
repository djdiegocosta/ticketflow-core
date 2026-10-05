/**
 * Carrega no navegador do comprador o SDK oficial do Mercado Pago (MercadoPago.JS V2)
 * e o script de segurança que gera o "identificador do dispositivo" (antifraude).
 * Nunca bloqueia a compra: se algo falhar, devolve undefined e o Pix segue normal.
 */
const SDK_SRC = "https://sdk.mercadopago.com/js/v2";
const SECURITY_SRC = "https://www.mercadopago.com/v2/security.js";

const loading = new Map<string, Promise<void>>();

function loadScript(src: string, attrs: Record<string, string> = {}): Promise<void> {
  const cached = loading.get(src);
  if (cached) return cached;
  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    el.onload = () => resolve();
    el.onerror = () => {
      loading.delete(src);
      reject(new Error(`Falha ao carregar ${src}`));
    };
    document.head.appendChild(el);
  });
  loading.set(src, promise);
  return promise;
}

let sdkInstance: unknown = null;

export async function getMpDeviceId(publicKey?: string | null): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  const w = window as any;
  try {
    await loadScript(SDK_SRC);
    if (publicKey && w.MercadoPago && !sdkInstance) {
      sdkInstance = new w.MercadoPago(publicKey, { locale: "pt-BR" });
    }
    await loadScript(SECURITY_SRC, { view: "checkout" });
    for (let i = 0; i < 30 && !w.MP_DEVICE_SESSION_ID; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return typeof w.MP_DEVICE_SESSION_ID === "string" ? w.MP_DEVICE_SESSION_ID : undefined;
  } catch (error) {
    console.warn("Identificador do dispositivo indisponível:", error);
    return undefined;
  }
}
