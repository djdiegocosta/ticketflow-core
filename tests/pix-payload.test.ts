import { describe, expect, it } from 'bun:test';
import {
  buildPixHeaders,
  buildPixPayload,
  DEVICE_ID_PATTERN,
  MP_STATEMENT_DESCRIPTOR,
  type PixSaleInput,
} from '../src/lib/mp/pix-payload';

const sale: PixSaleInput = {
  id: '11111111-1111-4111-8111-111111111111',
  sale_code: 'AB12CD34',
  total_amount: 120,
  batch_id: '22222222-2222-4222-8222-222222222222',
  quantity: 2,
  unit_price: 60,
  buyer_email: 'maria@example.com',
  buyer_name: 'Maria da Silva Santos',
};

const url = 'https://ticketflow-core.vercel.app/api/public/mp/webhook?org_id=org-1';

describe('buildPixPayload', () => {
  const payload = buildPixPayload({ sale, eventTitle: 'Festa de Verão', batchName: '1º Lote', notificationUrl: url });

  it('é um Pix com o valor, a referência da venda e o aviso (webhook) certos', () => {
    expect(payload.payment_method_id).toBe('pix');
    expect(payload.transaction_amount).toBe(120);
    expect(payload.external_reference).toBe(sale.id);
    expect(payload.notification_url).toBe(url);
    expect(payload.description).toBe('Ingresso TicketFlow - Venda AB12CD34');
  });

  it('envia a descrição do item (evento, lote, quantidade e preço)', () => {
    expect(payload.additional_info.items).toEqual([
      {
        id: sale.batch_id,
        title: 'Festa de Verão',
        description: 'Ingresso 1º Lote - Festa de Verão',
        category_id: 'tickets',
        quantity: 2,
        unit_price: 60,
      },
    ]);
  });

  it('envia o nome na fatura com no máximo 22 caracteres', () => {
    expect(payload.statement_descriptor).toBe(MP_STATEMENT_DESCRIPTOR);
    expect(MP_STATEMENT_DESCRIPTOR.length).toBeLessThanOrEqual(22);
    expect(MP_STATEMENT_DESCRIPTOR).toMatch(/^[A-Z0-9-]+$/);
  });

  it('separa nome e sobrenome do comprador', () => {
    expect(payload.payer).toEqual({ email: 'maria@example.com', first_name: 'Maria', last_name: 'da Silva Santos' });
  });

  it('usa "Cliente" como sobrenome quando o comprador tem um nome só', () => {
    const p = buildPixPayload({ sale: { ...sale, buyer_name: 'Maria' }, eventTitle: 'X', batchName: 'Y', notificationUrl: url });
    expect(p.payer.last_name).toBe('Cliente');
  });

  it('usa nomes padrão quando faltam evento e lote', () => {
    const p = buildPixPayload({ sale, eventTitle: null, batchName: undefined, notificationUrl: url });
    expect(p.additional_info.items[0]!.title).toBe('Evento');
    expect(p.additional_info.items[0]!.description).toBe('Ingresso Ingresso - Evento');
  });

  it('corta textos longos para caberem nos limites do Mercado Pago', () => {
    const p = buildPixPayload({ sale, eventTitle: 'E'.repeat(400), batchName: 'L'.repeat(400), notificationUrl: url });
    const item = p.additional_info.items[0]!;
    expect(item.title.length).toBe(250);
    expect(item.description.length).toBeLessThanOrEqual(250);
  });
});

describe('buildPixHeaders', () => {
  it('usa a chave de idempotência da venda (evita Pix duplicado)', () => {
    const h = buildPixHeaders('token-1', sale.id);
    expect(h['X-Idempotency-Key']).toBe(sale.id);
    expect(h.Authorization).toBe('Bearer token-1');
  });

  it('envia o identificador do dispositivo quando existe', () => {
    expect(buildPixHeaders('t', sale.id, 'device-abc-123')).toMatchObject({ 'X-meli-session-id': 'device-abc-123' });
  });

  it('não envia o cabeçalho do dispositivo quando não existe', () => {
    expect('X-meli-session-id' in buildPixHeaders('t', sale.id)).toBe(false);
    expect('X-meli-session-id' in buildPixHeaders('t', sale.id, undefined)).toBe(false);
  });
});

describe('DEVICE_ID_PATTERN', () => {
  it('aceita identificadores comuns', () => {
    expect(DEVICE_ID_PATTERN.test('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
    expect(DEVICE_ID_PATTERN.test('armor.abc123:def_456')).toBe(true);
  });

  it('recusa texto com espaço, símbolos ou código', () => {
    expect(DEVICE_ID_PATTERN.test('abc def')).toBe(false);
    expect(DEVICE_ID_PATTERN.test('<script>')).toBe(false);
    expect(DEVICE_ID_PATTERN.test('')).toBe(false);
  });
});
