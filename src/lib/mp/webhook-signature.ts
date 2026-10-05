/**
 * Conferência da assinatura (x-signature) que o Mercado Pago envia no webhook.
 * Lógica pura, sem acesso a banco, para poder ser testada.
 */

export function parseSignatureHeader(header: string): { ts: string; v1: string } | null {
  const parts = header.split(",");
  const ts = parts.find((p) => p.startsWith("ts="))?.split("=")[1];
  const v1 = parts.find((p) => p.startsWith("v1="))?.split("=")[1];
  if (!ts || !v1) return null;
  return { ts, v1 };
}

export function buildManifest(dataId: string, requestId: string, ts: string): string {
  return `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
}

export async function signManifest(secret: string, manifest: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparação em tempo constante (não vaza onde a assinatura difere). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidSignature(secret: string, manifest: string, v1: string): Promise<boolean> {
  return safeEqual(await signManifest(secret, manifest), v1);
}
