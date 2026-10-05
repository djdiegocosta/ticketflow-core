import { describe, expect, it } from 'bun:test';
import { createHmac } from 'node:crypto';
import {
  buildManifest,
  isValidSignature,
  parseSignatureHeader,
  safeEqual,
  signManifest,
} from '../src/lib/mp/webhook-signature';

describe('parseSignatureHeader', () => {
  it('lê ts e v1 do cabeçalho x-signature', () => {
    expect(parseSignatureHeader('ts=1700000000,v1=abc123')).toEqual({ ts: '1700000000', v1: 'abc123' });
  });

  it('recusa cabeçalho sem ts ou sem v1', () => {
    expect(parseSignatureHeader('v1=abc123')).toBeNull();
    expect(parseSignatureHeader('ts=1700000000')).toBeNull();
    expect(parseSignatureHeader('')).toBeNull();
  });
});

describe('buildManifest', () => {
  it('monta o texto assinado com o id em minúsculas', () => {
    expect(buildManifest('ABC-123', 'req-1', '1700000000')).toBe('id:abc-123;request-id:req-1;ts:1700000000;');
  });
});

describe('assinatura do webhook', () => {
  const secret = 'segredo-de-teste';
  const manifest = buildManifest('987654321', 'req-xyz', '1700000000');

  it('gera a mesma assinatura (HMAC-SHA256) que o padrão do Mercado Pago', async () => {
    const esperado = createHmac('sha256', secret).update(manifest).digest('hex');
    expect(await signManifest(secret, manifest)).toBe(esperado);
  });

  it('aceita a assinatura correta', async () => {
    const v1 = createHmac('sha256', secret).update(manifest).digest('hex');
    expect(await isValidSignature(secret, manifest, v1)).toBe(true);
  });

  it('recusa assinatura de outro segredo', async () => {
    const v1 = createHmac('sha256', 'outro-segredo').update(manifest).digest('hex');
    expect(await isValidSignature(secret, manifest, v1)).toBe(false);
  });

  it('recusa quando o id do pagamento foi adulterado', async () => {
    const v1 = createHmac('sha256', secret).update(manifest).digest('hex');
    const adulterado = buildManifest('111111111', 'req-xyz', '1700000000');
    expect(await isValidSignature(secret, adulterado, v1)).toBe(false);
  });

  it('recusa assinatura vazia ou de tamanho diferente', async () => {
    expect(await isValidSignature(secret, manifest, '')).toBe(false);
    expect(await isValidSignature(secret, manifest, 'abc')).toBe(false);
  });
});

describe('safeEqual', () => {
  it('compara textos iguais e diferentes', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
