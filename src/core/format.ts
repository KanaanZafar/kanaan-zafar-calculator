/**
 * Turns calculated cents into the text shown on screen. Formatting works on the BigInt digits
 * directly, so no amount ever passes through a floating-point number on its way to the screen.
 */
import type { Split } from './split.ts';

/**
 * 1234567n → "$12,345.67". Always two decimal places and comma thousands separators.
 * Every amount in a split is zero or more, so there is no negative case.
 */
export function formatCents(cents: bigint): string {
  const dollars = (cents / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const remainder = (cents % 100n).toString().padStart(2, '0');
  return `$${dollars}.${remainder}`;
}

export interface ShareLine {
  /** For example "Person 1 (paid the bill)" or "Persons 2–3". */
  label: string;
  /** For example "$42.30" or "$42.29 each". */
  amount: string;
}

/**
 * The share lines shown in the results:
 * - Person 1 (paid the bill) on its own line,
 * - then "Person 2" for two people, or "Persons 2–N … each" for three or more.
 */
export function shareLines(split: Split): ShareLine[] {
  const lines: ShareLine[] = [
    { label: 'Person 1 (paid the bill)', amount: formatCents(split.payerShare) },
  ];
  if (split.people === 2n) {
    lines.push({ label: 'Person 2', amount: formatCents(split.baseShare) });
  } else if (split.people > 2n) {
    lines.push({
      label: `Persons 2–${split.people}`,
      amount: `${formatCents(split.baseShare)} each`,
    });
  }
  return lines;
}

/** A share line as one string, for example "Persons 2–3: $42.29 each". */
export function shareLineText(line: ShareLine): string {
  return `${line.label}: ${line.amount}`;
}

/** One sentence summary of a result, announced to screen readers when the result changes. */
export function describeSplit(split: Split): string {
  const shares = shareLines(split)
    .map((line) => `${line.label.replace('–', ' to ')}: ${line.amount}.`)
    .join(' ');
  return (
    `Total ${formatCents(split.total)}, including tax ${formatCents(split.tax)} ` +
    `and tip ${formatCents(split.tip)}. ${shares} ` +
    `Amount to collect from others: ${formatCents(split.amountToCollect)}.`
  );
}
