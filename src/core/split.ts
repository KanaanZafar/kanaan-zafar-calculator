/**
 * The bill calculation, in whole cents with BigInt so no step can produce a fraction of a cent.
 *
 * Rules (docs/user-stories.md, "Calculation"):
 * 1. Tax = subtotal × tax rate, rounded half up to the cent.
 * 2. Tip = subtotal × tip rate (before tax), rounded half up to the cent.
 * 3. Total = subtotal + rounded tax + rounded tip.
 * 4. Base share = total ÷ people, rounded down. Persons 2..N each pay the base share.
 * 5. Person 1 (who paid the bill) pays the base share plus every leftover cent.
 * 6. Amount to collect from others = total − Person 1's share = base share × (people − 1).
 */

export interface BillInput {
  /** Subtotal in cents. */
  subtotal: bigint;
  /** Tax rate in thousandths of a percent (8.875% → 8875n). */
  taxRate: bigint;
  /** Tip rate in thousandths of a percent (18% → 18000n). */
  tipRate: bigint;
  /** Number of people, including the person who paid. */
  people: bigint;
}

/** Every amount is in cents. */
export interface Split {
  subtotal: bigint;
  tax: bigint;
  tip: bigint;
  total: bigint;
  people: bigint;
  /** What each of Persons 2..N pays. */
  baseShare: bigint;
  /** What Person 1, who paid the bill, pays: the base share plus the leftover cents. */
  payerShare: bigint;
  /** What Person 1 collects from everyone else. */
  amountToCollect: bigint;
}

/** Thousandths of a percent in one whole: 100% = 100,000. */
const RATE_SCALE = 100_000n;

/** numerator ÷ denominator rounded half up, for numerator ≥ 0 and denominator > 0. */
export function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (2n * numerator + denominator) / (2n * denominator);
}

/** `rate` (in thousandths of a percent) of `cents`, rounded half up to the cent. */
function percentOf(cents: bigint, rate: bigint): bigint {
  return divideRoundHalfUp(cents * rate, RATE_SCALE);
}

export function calculateSplit({ subtotal, taxRate, tipRate, people }: BillInput): Split {
  // Inputs reaching here have already passed parsing; these guard against programming errors.
  if (subtotal < 0n || taxRate < 0n || tipRate < 0n) {
    throw new RangeError('Subtotal and rates must not be negative.');
  }
  if (people < 1n) throw new RangeError('There must be at least one person.');

  const tax = percentOf(subtotal, taxRate);
  const tip = percentOf(subtotal, tipRate);
  const total = subtotal + tax + tip;

  // BigInt division rounds down for non-negative values.
  const baseShare = total / people;
  const leftoverCents = total - baseShare * people;
  const payerShare = baseShare + leftoverCents;

  return {
    subtotal,
    tax,
    tip,
    total,
    people,
    baseShare,
    payerShare,
    amountToCollect: total - payerShare,
  };
}
