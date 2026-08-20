import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getEncryptionKey() {
  const keyStr = process.env["APP_ENCRYPTION_KEY"];
  if (!keyStr) throw new Error("APP_ENCRYPTION_KEY not set");
  // No Workers AES-GCM precisa de 32 bytes para AES-256
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(keyStr.padEnd(32, "0").substring(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encrypt(text: string) {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  return `${ivBase64}:${encryptedBase64}`;
}

export async function decrypt(encryptedData: string) {
  const [ivBase64, encryptedBase64] = encryptedData.split(":");
  const key = await getEncryptionKey();
  
  const iv = new Uint8Array(atob(ivBase64!).split("").map(c => c.charCodeAt(0)));
  const encrypted = new Uint8Array(atob(encryptedBase64!).split("").map(c => c.charCodeAt(0)));
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}
