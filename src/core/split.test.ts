import { describe, expect, it } from 'vitest';
import { MAX_PEOPLE, MAX_SUBTOTAL_CENTS, MAX_TAX_RATE, MAX_TIP_RATE } from './parse.ts';
import { calculateSplit, divideRoundHalfUp, type BillInput, type Split } from './split.ts';

const RATE_SCALE = 100_000n;

/** Small seeded generator so the random cases are the same on every run. */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBigInt(random: () => number, min: bigint, max: bigint): bigint {
  return min + BigInt(Math.floor(random() * Number(max - min + 1n)));
}

/** Boundary values combined with each other, plus seeded random inputs across the full range. */
function inputsToCheck(): BillInput[] {
  const subtotals = [1n, 2n, 99n, 100n, 101n, 12_345n, 99_999_998n, MAX_SUBTOTAL_CENTS];
  const taxRates = [0n, 1n, 4_999n, 5_000n, 8_875n, MAX_TAX_RATE];
  const tipRates = [0n, 1n, 15_000n, 18_000n, 99_999n, MAX_TIP_RATE];
  const peoples = [1n, 2n, 3n, 7n, 99n, MAX_PEOPLE];

  const inputs: BillInput[] = [];
  for (const subtotal of subtotals)
    for (const taxRate of taxRates)
      for (const tipRate of tipRates)
        for (const people of peoples) inputs.push({ subtotal, taxRate, tipRate, people });

  const random = seededRandom(20261007);
  for (let i = 0; i < 50_000; i++) {
    inputs.push({
      subtotal: randomBigInt(random, 1n, MAX_SUBTOTAL_CENTS),
      taxRate: randomBigInt(random, 0n, MAX_TAX_RATE),
      tipRate: randomBigInt(random, 0n, MAX_TIP_RATE),
      people: randomBigInt(random, 1n, MAX_PEOPLE),
    });
  }
  return inputs;
}

/**
 * Checks that `rounded` is `amount × rate` rounded half up to the cent, without reusing the
 * production formula: the exact value is amount × rate / 100,000 cents, so the rounding error,
 * scaled by 100,000, must be at most half a cent, and an exact half must have been rounded up.
 */
function isRoundedHalfUp(rounded: bigint, amount: bigint, rate: bigint): boolean {
  const exactScaled = amount * rate;
  const roundedScaled = rounded * RATE_SCALE;
  const error = roundedScaled - exactScaled;
  const half = RATE_SCALE / 2n;
  return error > -half && error <= half;
}

const inputs = inputsToCheck();
const splits: [BillInput, Split][] = inputs.map((input) => [input, calculateSplit(input)]);

describe(`rules that hold for every bill (${inputs.length.toLocaleString('en-US')} inputs)`, () => {
  it('the shares add up exactly to the total', () => {
    for (const [, s] of splits) {
      expect(s.payerShare + s.baseShare * (s.people - 1n)).toBe(s.total);
    }
  });

  it('subtotal + tax + tip equals the total', () => {
    for (const [, s] of splits) {
      expect(s.subtotal + s.tax + s.tip).toBe(s.total);
    }
  });

  it('amount to collect = total − Person 1 = base share × (people − 1)', () => {
    for (const [, s] of splits) {
      expect(s.amountToCollect).toBe(s.total - s.payerShare);
      expect(s.amountToCollect).toBe(s.baseShare * (s.people - 1n));
    }
  });

  it('Person 1 pays the base share plus fewer leftover cents than there are people', () => {
    for (const [, s] of splits) {
      const leftover = s.payerShare - s.baseShare;
      expect(leftover >= 0n && leftover < s.people).toBe(true);
    }
  });

  it('tax and tip are each rounded half up to the cent from the subtotal', () => {
    for (const [input, s] of splits) {
      expect(isRoundedHalfUp(s.tax, input.subtotal, input.taxRate)).toBe(true);
      expect(isRoundedHalfUp(s.tip, input.subtotal, input.tipRate)).toBe(true);
    }
  });

  it('no amount is negative', () => {
    for (const [, s] of splits) {
      for (const amount of [s.tax, s.tip, s.total, s.baseShare, s.payerShare, s.amountToCollect]) {
        expect(amount >= 0n).toBe(true);
      }
    }
  });

  it('the same input always gives the same result', () => {
    for (const [input, s] of splits.slice(0, 1_000)) {
      expect(calculateSplit(input)).toEqual(s);
    }
  });
});

describe('rounding', () => {
  it('rounds an exact half cent up (8.875% of $100.00 = 887.5 cents → $8.88)', () => {
    expect(calculateSplit({ subtotal: 10_000n, taxRate: 8_875n, tipRate: 0n, people: 1n }).tax).toBe(
      888n,
    );
  });

  it('rounds below a half cent down (10% of $0.04 = 0.4 cents → $0.00)', () => {
    expect(calculateSplit({ subtotal: 4n, taxRate: 10_000n, tipRate: 0n, people: 1n }).tax).toBe(0n);
  });

  it('rounds above a half cent up (10% of $0.06 = 0.6 cents → $0.01)', () => {
    expect(calculateSplit({ subtotal: 6n, taxRate: 10_000n, tipRate: 0n, people: 1n }).tax).toBe(1n);
  });

  it('calculates the tip on the subtotal before tax ($18.00, not $19.60)', () => {
    const split = calculateSplit({ subtotal: 10_000n, taxRate: 8_875n, tipRate: 18_000n, people: 3n });
    expect(split.tip).toBe(1_800n);
  });

  it('divideRoundHalfUp rounds halves up and everything else to the nearest', () => {
    expect([1n, 2n, 3n, 4n, 5n, 6n].map((n) => divideRoundHalfUp(n, 4n))).toEqual([
      0n, 1n, 1n, 1n, 1n, 2n,
    ]);
  });
});

describe('guards against programming errors', () => {
  it('rejects zero people', () => {
    expect(() => calculateSplit({ subtotal: 100n, taxRate: 0n, tipRate: 0n, people: 0n })).toThrow(
      RangeError,
    );
  });

  it('rejects negative amounts', () => {
    expect(() => calculateSplit({ subtotal: -1n, taxRate: 0n, tipRate: 0n, people: 1n })).toThrow(
      RangeError,
    );
  });
});
