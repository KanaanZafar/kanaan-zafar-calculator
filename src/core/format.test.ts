import { describe, expect, it } from 'vitest';
import { describeSplit, formatCents, shareLines } from './format.ts';
import { calculateSplit } from './split.ts';

describe('formatCents', () => {
  it.each([
    [0n, '$0.00'],
    [1n, '$0.01'],
    [50n, '$0.50'],
    [12_688n, '$126.88'],
    [100_000n, '$1,000.00'],
    [99_999_999n, '$999,999.99'],
    [229_999_998n, '$2,299,999.98'],
  ])('%i cents → %s', (cents, text) => {
    expect(formatCents(cents)).toBe(text);
  });
});

describe('shareLines', () => {
  const split = (people: bigint) =>
    calculateSplit({ subtotal: 10_000n, taxRate: 0n, tipRate: 0n, people });

  it('one person: Person 1 only', () => {
    expect(shareLines(split(1n))).toEqual([
      { label: 'Person 1 (paid the bill)', amount: '$100.00' },
    ]);
  });

  it('two people: Person 2 on its own', () => {
    expect(shareLines(split(2n))).toEqual([
      { label: 'Person 1 (paid the bill)', amount: '$50.00' },
      { label: 'Person 2', amount: '$50.00' },
    ]);
  });

  it('three or more people: Persons 2–N each', () => {
    expect(shareLines(split(3n))).toEqual([
      { label: 'Person 1 (paid the bill)', amount: '$33.34' },
      { label: 'Persons 2–3', amount: '$33.33 each' },
    ]);
  });
});

describe('describeSplit (screen reader announcement)', () => {
  it('reads the total, every share and the amount to collect', () => {
    const split = calculateSplit({ subtotal: 10_000n, taxRate: 8_875n, tipRate: 18_000n, people: 3n });
    expect(describeSplit(split)).toBe(
      'Total $126.88, including tax $8.88 and tip $18.00. ' +
        'Person 1 (paid the bill): $42.30. Persons 2 to 3: $42.29 each. ' +
        'Amount to collect from others: $84.58.',
    );
  });
});
