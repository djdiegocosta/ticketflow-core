import { describe, expect, it } from 'bun:test';
import { buildCheckoutPrefill } from '../src/lib/checkout-prefill';

describe('buildCheckoutPrefill', () => {
  it('returns empty defaults for a guest checkout', () => {
    expect(buildCheckoutPrefill(null, null)).toEqual({});
  });

  it('uses the customer profile for an authenticated customer', () => {
    expect(
      buildCheckoutPrefill(
        {
          full_name: '  Maria Silva  ',
          whatsapp: '  (22) 99999-1111  ',
          email: '  maria@example.com  ',
        },
        'auth@example.com',
      ),
    ).toEqual({
      buyerName: 'Maria Silva',
      buyerWhatsApp: '(22) 99999-1111',
      buyerEmail: 'maria@example.com',
    });
  });

  it('falls back to the authenticated email when the customer profile has no email', () => {
    expect(
      buildCheckoutPrefill(
        {
          full_name: 'João Souza',
          whatsapp: '22988887777',
          email: null,
        },
        'joao@example.com',
      ),
    ).toEqual({
      buyerName: 'João Souza',
      buyerWhatsApp: '22988887777',
      buyerEmail: 'joao@example.com',
    });
  });

  it('uses the authenticated email even when no customer profile exists yet', () => {
    expect(buildCheckoutPrefill(null, 'novo@example.com')).toEqual({
      buyerEmail: 'novo@example.com',
    });
  });

  it('does not invent missing profile fields', () => {
    expect(
      buildCheckoutPrefill(
        { full_name: null, whatsapp: null, email: null },
        null,
      ),
    ).toEqual({});
  });
});
