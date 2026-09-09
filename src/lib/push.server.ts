import {
  createCipheriv,
  createECDH,
  createHmac,
  createPrivateKey,
  createSign,
  randomBytes,
} from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  active: boolean;
};

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

const textEncoder = new TextEncoder();

function base64UrlEncode(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function getVapidConfig() {
  const publicKey = process.env["VAPID_PUBLIC_KEY"]?.trim();
  const privateKey = process.env["VAPID_PRIVATE_KEY"]?.trim();
  const subject = process.env["VAPID_SUBJECT"]?.trim() || "mailto:suporte@ticketflow.app";

  if (!publicKey || !privateKey) {
    throw new Error("Web Push não configurado: defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.");
  }

  const publicRaw = base64UrlDecode(publicKey);
  const privateRaw = base64UrlDecode(privateKey);

  if (publicRaw.length !== 65 || publicRaw[0] !== 4 || privateRaw.length !== 32) {
    throw new Error("Chaves VAPID inválidas. Gere um par P-256 em formato base64url.");
  }

  return { publicKey, privateKey, subject, publicRaw, privateRaw };
}

function createVapidPrivateKey(rawPrivate: Buffer, rawPublic: Buffer) {
  return createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      d: base64UrlEncode(rawPrivate),
      x: base64UrlEncode(rawPublic.subarray(1, 33)),
      y: base64UrlEncode(rawPublic.subarray(33, 65)),
    },
    format: "jwk",
  });
}

function createVapidJwt(audience: string): string {
  const { publicRaw, privateRaw, subject } = getVapidConfig();
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
    sub: subject,
  };
  const encodedHeader = base64UrlEncode(textEncoder.encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(textEncoder.encode(JSON.stringify(payload)));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign({
    key: createVapidPrivateKey(privateRaw, publicRaw),
    dsaEncoding: "ieee-p1363",
  });
  return `${unsigned}.${base64UrlEncode(signature)}`;
}

function hkdfExtract(salt: Uint8Array, input: Uint8Array): Buffer {
  return createHmac("sha256", Buffer.from(salt)).update(Buffer.from(input)).digest();
}

function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Buffer {
  const blocks: Buffer[] = [];
  let previous = Buffer.alloc(0);
  for (let counter = 1; Buffer.concat(blocks).length < length; counter++) {
    previous = createHmac("sha256", Buffer.from(prk))
      .update(Buffer.concat([previous, Buffer.from(info), Buffer.from([counter])]))
      .digest();
    blocks.push(previous);
  }
  return Buffer.concat(blocks).subarray(0, length);
}

function encryptWebPush(subscription: StoredSubscription, payload: PushPayload) {
  const uaPublic = base64UrlDecode(subscription.p256dh);
  const authSecret = base64UrlDecode(subscription.auth);
  if (uaPublic.length !== 65 || uaPublic[0] !== 4 || authSecret.length !== 16) {
    throw new Error("PushSubscription contém chaves inválidas.");
  }

  const serverEcdh = createECDH("prime256v1");
  serverEcdh.generateKeys();
  const serverPublic = serverEcdh.getPublicKey(undefined, "uncompressed");
  const ecdhSecret = serverEcdh.computeSecret(uaPublic);

  // RFC 8291: derive the content encryption key and nonce with HKDF-SHA256.
  const prkKey = hkdfExtract(authSecret, ecdhSecret);
  const keyInfo = Buffer.concat([
    textEncoder.encode("WebPush: info"),
    Buffer.from([0]),
    uaPublic,
    serverPublic,
  ]);
  const ikm = hkdfExpand(prkKey, keyInfo, 32);
  const salt = randomBytes(16);
  const prk = hkdfExtract(salt, ikm);
  const cek = hkdfExpand(
    prk,
    Buffer.concat([textEncoder.encode("Content-Encoding: aes128gcm"), Buffer.from([0])]),
    16,
  );
  const nonce = hkdfExpand(
    prk,
    Buffer.concat([textEncoder.encode("Content-Encoding: nonce"), Buffer.from([0])]),
    12,
  );

  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const record = Buffer.concat([plaintext, Buffer.from([2])]);
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(record), cipher.final(), cipher.getAuthTag()]);
  const recordSize = 4096;
  const body = Buffer.concat([
    salt,
    Buffer.from([
      (recordSize >>> 24) & 0xff,
      (recordSize >>> 16) & 0xff,
      (recordSize >>> 8) & 0xff,
      recordSize & 0xff,
    ]),
    Buffer.from([serverPublic.length]),
    serverPublic,
    ciphertext,
  ]);

  return { body, salt, serverPublic };
}

export async function sendPushSubscription(subscription: StoredSubscription, payload: PushPayload) {
  const { publicKey } = getVapidConfig();
  const endpointUrl = new URL(subscription.endpoint);
  const jwt = createVapidJwt(endpointUrl.origin);
  const encrypted = encryptWebPush(subscription, payload);

  return fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      TTL: "60",
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      Authorization: `vapid t=${jwt}, k=${publicKey}`,
      "Crypto-Key": `dh=${base64UrlEncode(encrypted.serverPublic)}`,
      Encryption: `salt=${base64UrlEncode(encrypted.salt)}`,
      Urgency: "high",
    },
    body: encrypted.body,
  });
}

async function sendToSubscriptions(subscriptions: StoredSubscription[], payload: PushPayload) {
  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      const response = await sendPushSubscription(subscription, payload);
      if (response.status === 404 || response.status === 410) {
        await (supabaseAdmin as any)
          .from("push_subscriptions")
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq("id", subscription.id);
        return { id: subscription.id, status: "expired" as const };
      }
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Push service ${response.status}: ${text.slice(0, 300)}`);
      }
      return { id: subscription.id, status: "sent" as const };
    }),
  );

  return results;
}

export async function sendPushToOrganization(organizationId: string, payload: PushPayload) {
  const { data, error } = await (supabaseAdmin as any)
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, active")
    .eq("organization_id", organizationId)
    .eq("active", true);

  if (error) throw error;
  if (!data?.length) return [];
  return sendToSubscriptions(data as StoredSubscription[], payload);
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const { data, error } = await (supabaseAdmin as any)
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, active")
    .eq("user_id", userId)
    .eq("active", true);

  if (error) throw error;
  if (!data?.length) return [];
  return sendToSubscriptions(data as StoredSubscription[], payload);
}
