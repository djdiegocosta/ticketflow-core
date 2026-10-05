import { describe, expect, it } from 'bun:test';
import { safeReturnTo } from '../src/lib/return-to';

describe('safeReturnTo (volta ao checkout depois do login)', () => {
  it('aceita caminhos internos de evento', () => {
    expect(safeReturnTo('/e/festa-verao/checkout')).toBe('/e/festa-verao/checkout');
    expect(safeReturnTo('/e/festa-verao/checkout?ref=abc')).toBe('/e/festa-verao/checkout?ref=abc');
  });

  it('recusa endereços de outros sites', () => {
    expect(safeReturnTo('https://site-falso.com')).toBeUndefined();
    expect(safeReturnTo('//site-falso.com')).toBeUndefined();
    expect(safeReturnTo('/\\site-falso.com')).toBeUndefined();
  });

  it('recusa caminhos fora de /e/ e tentativas de subir de pasta', () => {
    expect(safeReturnTo('/admin')).toBeUndefined();
    expect(safeReturnTo('/e/../admin')).toBeUndefined();
  });

  it('recusa valores que não são texto', () => {
    expect(safeReturnTo(undefined)).toBeUndefined();
    expect(safeReturnTo(null)).toBeUndefined();
    expect(safeReturnTo(123)).toBeUndefined();
  });
});
