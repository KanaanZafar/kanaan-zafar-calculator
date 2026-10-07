/**
 * Reads the raw text of each input field into an exact whole number, or explains why it can't.
 *
 * Text is never converted with parseFloat/Number: digits are read straight into a BigInt, so
 * no value is ever rounded on the way in. The rules and messages here are the ones listed in
 * docs/user-stories.md (Rules section and the S-4 error message table).
 */

/**
 * Outcome of reading one field.
 *
 * - `valid`: the exact value to calculate with.
 * - `pending`: the text could still become valid as the user keeps typing (an empty field, a
 *   lone separator, a subtotal that is so far zero). Its message is shown only once the user
 *   has left the field.
 * - `invalid`: typing more cannot fix it, so its message is shown immediately.
 */
export type FieldResult =
  | { status: 'valid'; value: bigint }
  | { status: 'pending'; message: string }
  | { status: 'invalid'; message: string };

/** Largest subtotal, in cents ($999,999.99). */
export const MAX_SUBTOTAL_CENTS = 99_999_999n;
/** Largest tax rate, in thousandths of a percent (30%). */
export const MAX_TAX_RATE = 30_000n;
/** Largest tip rate, in thousandths of a percent (100%). */
export const MAX_TIP_RATE = 100_000n;
/** Largest number of people. */
export const MAX_PEOPLE = 100n;

export const MESSAGES = {
  subtotal: {
    required: 'Enter the subtotal.',
    negative: "Subtotal can't be negative.",
    format: 'Use only digits and a decimal point or comma, for example 84.50.',
    thousands: "Don't use thousands separators. Use one decimal point or comma, for example 1000.50.",
    decimals: 'Subtotal can have at most 2 decimal places.',
    min: 'Subtotal must be at least $0.01.',
    max: "Subtotal can't be more than $999,999.99.",
  },
  taxRate: {
    required: 'Enter the tax rate (use 0 for no tax).',
    negative: "Tax rate can't be negative.",
    format: 'Use only digits and one decimal point or comma, for example 8.875.',
    decimals: 'Tax rate can have at most 3 decimal places.',
    max: "Tax rate can't be more than 30%.",
  },
  tipRate: {
    required: 'Enter the tip rate (use 0 for no tip).',
    negative: "Tip rate can't be negative.",
    format: 'Use only digits and one decimal point or comma, for example 18.',
    decimals: 'Tip rate can have at most 3 decimal places.',
    max: "Tip rate can't be more than 100%.",
  },
  people: {
    required: 'Enter the number of people.',
    min: 'Number of people must be at least 1.',
    whole: 'Use a whole number of people, for example 4.',
    max: "Number of people can't be more than 100.",
  },
} as const;

const valid = (value: bigint): FieldResult => ({ status: 'valid', value });
const pending = (message: string): FieldResult => ({ status: 'pending', message });
const invalid = (message: string): FieldResult => ({ status: 'invalid', message });

const NOT_A_DIGIT_OR_SEPARATOR = /[^0-9.,]/;
const SEPARATORS = /[.,]/g;

function countSeparators(text: string): number {
  return text.match(SEPARATORS)?.length ?? 0;
}

function isLoneSeparator(text: string): boolean {
  return text === '.' || text === ',';
}

/**
 * Turns text with at most one separator into a whole number scaled by 10^places.
 * For example ("12.5", 2) → 1250n and (".5", 2) → 50n. The caller has already checked that the
 * text holds only digits and one separator, and that the fraction has at most `places` digits.
 */
function toScaledInteger(text: string, places: number): bigint {
  const [whole, fraction = ''] = text.split(/[.,]/);
  return BigInt((whole || '0') + fraction.padEnd(places, '0'));
}

function fractionDigits(text: string): number {
  const [, fraction = ''] = text.split(/[.,]/);
  return fraction.length;
}

/** Subtotal → whole cents. */
export function parseSubtotal(raw: string): FieldResult {
  const m = MESSAGES.subtotal;
  const text = raw.trim();

  if (text === '') return pending(m.required);
  if (text.startsWith('-')) return invalid(m.negative);
  if (NOT_A_DIGIT_OR_SEPARATOR.test(text)) return invalid(m.format);
  if (isLoneSeparator(text)) return pending(m.format);
  // A subtotal never has three decimal places, so a comma followed by exactly three digits
  // (such as 1,000) is a thousands separator, not a decimal comma.
  if (countSeparators(text) > 1 || /,\d{3}$/.test(text)) return invalid(m.thousands);
  if (fractionDigits(text) > 2) return invalid(m.decimals);

  const cents = toScaledInteger(text, 2);
  if (cents === 0n) return pending(m.min);
  if (cents > MAX_SUBTOTAL_CENTS) return invalid(m.max);
  return valid(cents);
}

type RateMessages = (typeof MESSAGES)['taxRate'] | (typeof MESSAGES)['tipRate'];

/** Percentage → whole thousandths of a percent (8.875% → 8875n). 0 is allowed. */
function parseRate(raw: string, max: bigint, m: RateMessages): FieldResult {
  const text = raw.trim();

  if (text === '') return pending(m.required);
  if (text.startsWith('-')) return invalid(m.negative);
  if (NOT_A_DIGIT_OR_SEPARATOR.test(text) || countSeparators(text) > 1) return invalid(m.format);
  if (isLoneSeparator(text)) return pending(m.format);
  if (fractionDigits(text) > 3) return invalid(m.decimals);

  const rate = toScaledInteger(text, 3);
  if (rate > max) return invalid(m.max);
  return valid(rate);
}

/** Tax rate → whole thousandths of a percent. */
export function parseTaxRate(raw: string): FieldResult {
  return parseRate(raw, MAX_TAX_RATE, MESSAGES.taxRate);
}

/** Tip rate → whole thousandths of a percent. */
export function parseTipRate(raw: string): FieldResult {
  return parseRate(raw, MAX_TIP_RATE, MESSAGES.tipRate);
}

/** Number of people → whole number, including the person who paid. */
export function parsePeople(raw: string): FieldResult {
  const m = MESSAGES.people;
  const text = raw.trim();

  if (text === '') return pending(m.required);
  if (text.startsWith('-')) return invalid(m.min);
  if (!/^\d+$/.test(text)) return invalid(m.whole);

  const people = BigInt(text);
  if (people === 0n) return invalid(m.min);
  if (people > MAX_PEOPLE) return invalid(m.max);
  return valid(people);
}
