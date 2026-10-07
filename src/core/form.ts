/**
 * Combines the four fields into one evaluation: what each field holds, which error (if any) to
 * show under it, and the result. Kept free of the DOM so the live-update rules can be tested.
 */
import {
  parsePeople,
  parseSubtotal,
  parseTaxRate,
  parseTipRate,
  type FieldResult,
} from './parse.ts';
import { calculateSplit, type Split } from './split.ts';

export const FIELD_NAMES = ['subtotal', 'taxRate', 'tipRate', 'people'] as const;
export type FieldName = (typeof FIELD_NAMES)[number];

/** The raw text of each field, exactly as typed. */
export type FormValues = Record<FieldName, string>;

export interface FormEvaluation {
  fields: Record<FieldName, FieldResult>;
  /** The result, or null when any field is empty or invalid. */
  split: Split | null;
}

export const NO_RESULT_HINT = 'Enter the subtotal, tax, tip and number of people to see the split.';

export function evaluateForm(values: FormValues): FormEvaluation {
  const fields = {
    subtotal: parseSubtotal(values.subtotal),
    taxRate: parseTaxRate(values.taxRate),
    tipRate: parseTipRate(values.tipRate),
    people: parsePeople(values.people),
  };
  const { subtotal, taxRate, tipRate, people } = fields;

  const split =
    subtotal.status === 'valid' &&
    taxRate.status === 'valid' &&
    tipRate.status === 'valid' &&
    people.status === 'valid'
      ? calculateSplit({
          subtotal: subtotal.value,
          taxRate: taxRate.value,
          tipRate: tipRate.value,
          people: people.value,
        })
      : null;

  return { fields, split };
}

export interface FieldInteraction {
  /** The user has left this field at least once. */
  visited: boolean;
  /** The cursor is in this field right now. */
  focused: boolean;
}

/**
 * The message to show under a field, or null.
 * Invalid input is reported immediately. Input that may still be part-way through valid typing
 * is reported only once the user has left the field, so errors don't flash while typing.
 */
export function visibleError(field: FieldResult, interaction: FieldInteraction): string | null {
  if (field.status === 'invalid') return field.message;
  if (field.status === 'pending' && interaction.visited && !interaction.focused) {
    return field.message;
  }
  return null;
}
