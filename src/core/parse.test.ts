import { describe, expect, it } from 'vitest';
import { MESSAGES, parsePeople, parseSubtotal, parseTaxRate, parseTipRate } from './parse.ts';

const ok = (value: bigint) => ({ status: 'valid', value });
const pending = (message: string) => ({ status: 'pending', message });
const invalid = (message: string) => ({ status: 'invalid', message });

describe('parseSubtotal → cents', () => {
  const m = MESSAGES.subtotal;

  it.each([
    ['100.00', 10_000n],
    ['100,00', 10_000n],
    ['12.5', 1_250n],
    ['12,5', 1_250n],
    ['12.', 1_200n],
    ['12,', 1_200n],
    ['.5', 50n],
    [',05', 5n],
    ['0.01', 1n],
    ['007', 700n],
    ['  12.50  ', 1_250n],
    ['999999.99', 99_999_999n],
    ['1,5', 150n],
    ['1,50', 150n],
  ])('accepts %j as %i cents', (text, cents) => {
    expect(parseSubtotal(text)).toEqual(ok(cents));
  });

  it.each([
    ['', pending(m.required)],
    ['   ', pending(m.required)],
    ['-5', invalid(m.negative)],
    ['-', invalid(m.negative)],
    ['-1,000', invalid(m.negative)],
    ['$12', invalid(m.format)],
    ['1e3', invalid(m.format)],
    ['abc', invalid(m.format)],
    ['1 000', invalid(m.format)],
    ['12.5%', invalid(m.format)],
    ['.', pending(m.format)],
    [',', pending(m.format)],
    ['1,000', invalid(m.thousands)],
    ['12,345', invalid(m.thousands)],
    ['1,000.00', invalid(m.thousands)],
    ['1.000,00', invalid(m.thousands)],
    ['12.5.3', invalid(m.thousands)],
    ['1,000,000', invalid(m.thousands)],
    ['12.345', invalid(m.decimals)],
    ['12,3456', invalid(m.decimals)],
    ['0.001', invalid(m.decimals)],
    ['0', pending(m.min)],
    ['0.', pending(m.min)],
    ['0,', pending(m.min)],
    ['0.0', pending(m.min)],
    ['0.00', pending(m.min)],
    ['1000000', invalid(m.max)],
    ['1000000.00', invalid(m.max)],
    ['99999999999999999999999999', invalid(m.max)],
  ])('rejects %j', (text, expected) => {
    expect(parseSubtotal(text)).toEqual(expected);
  });

  it('reads every cent amount back exactly, with a point or a comma', () => {
    for (let cents = 0n; cents <= 100_000n; cents += 7n) {
      const text = `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
      const expected = cents === 0n ? pending(m.min) : ok(cents);
      expect(parseSubtotal(text)).toEqual(expected);
      expect(parseSubtotal(text.replace('.', ','))).toEqual(expected);
    }
  });
});

describe('parseTaxRate → thousandths of a percent', () => {
  const m = MESSAGES.taxRate;

  it.each([
    ['0', 0n],
    ['8.875', 8_875n],
    ['8,875', 8_875n],
    ['8.', 8_000n],
    ['.5', 500n],
    ['30', 30_000n],
    ['30.000', 30_000n],
    ['1,000', 1_000n],
  ])('accepts %j as %i', (text, rate) => {
    expect(parseTaxRate(text)).toEqual(ok(rate));
  });

  it.each([
    ['', pending(m.required)],
    ['-1', invalid(m.negative)],
    ['8%', invalid(m.format)],
    ['1e1', invalid(m.format)],
    ['8.8.75', invalid(m.format)],
    ['1,000.5', invalid(m.format)],
    ['.', pending(m.format)],
    [',', pending(m.format)],
    ['8.8755', invalid(m.decimals)],
    ['30.001', invalid(m.max)],
    ['31', invalid(m.max)],
  ])('rejects %j', (text, expected) => {
    expect(parseTaxRate(text)).toEqual(expected);
  });
});

describe('parseTipRate → thousandths of a percent', () => {
  const m = MESSAGES.tipRate;

  it.each([
    ['0', 0n],
    ['18', 18_000n],
    ['18,5', 18_500n],
    ['100', 100_000n],
  ])('accepts %j as %i', (text, rate) => {
    expect(parseTipRate(text)).toEqual(ok(rate));
  });

  it.each([
    ['', pending(m.required)],
    ['-10', invalid(m.negative)],
    ['18 %', invalid(m.format)],
    ['.', pending(m.format)],
    ['18.0001', invalid(m.decimals)],
    ['100.001', invalid(m.max)],
  ])('rejects %j', (text, expected) => {
    expect(parseTipRate(text)).toEqual(expected);
  });
});

describe('parsePeople → whole number', () => {
  const m = MESSAGES.people;

  it.each([
    ['1', 1n],
    ['3', 3n],
    ['007', 7n],
    [' 4 ', 4n],
    ['100', 100n],
  ])('accepts %j as %i', (text, people) => {
    expect(parsePeople(text)).toEqual(ok(people));
  });

  it.each([
    ['', pending(m.required)],
    ['-2', invalid(m.min)],
    ['-2.5', invalid(m.min)],
    ['0', invalid(m.min)],
    ['00', invalid(m.min)],
    ['2.5', invalid(m.whole)],
    ['2,5', invalid(m.whole)],
    ['2.', invalid(m.whole)],
    ['1e3', invalid(m.whole)],
    ['1,000', invalid(m.whole)],
    ['four', invalid(m.whole)],
    ['101', invalid(m.max)],
  ])('rejects %j', (text, expected) => {
    expect(parsePeople(text)).toEqual(expected);
  });
});
