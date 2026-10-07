/**
 * The acceptance criteria from docs/user-stories.md, run through the same pure functions the
 * UI uses (evaluateForm → visibleError / formatCents / shareLines). Each test name starts with
 * the story and criterion number so it can be traced back to the document.
 */
import { describe, expect, it } from 'vitest';
import {
  evaluateForm,
  FIELD_NAMES,
  NO_RESULT_HINT,
  visibleError,
  type FieldName,
  type FormValues,
} from './form.ts';
import { formatCents, shareLineText, shareLines } from './format.ts';

const EMPTY: FormValues = { subtotal: '', taxRate: '', tipRate: '', people: '' };

/** What the results area shows for these inputs, or null when it shows no result. */
function results(values: Partial<FormValues>) {
  const { split } = evaluateForm({ ...EMPTY, ...values });
  if (!split) return null;
  return {
    subtotal: formatCents(split.subtotal),
    tax: formatCents(split.tax),
    tip: formatCents(split.tip),
    total: formatCents(split.total),
    shares: shareLines(split).map(shareLineText),
    collect: formatCents(split.amountToCollect),
  };
}

/**
 * The messages visible under each field.
 * `visited` lists fields the user has left at least once; `focused` is where the cursor is.
 */
function errors(
  values: Partial<FormValues>,
  { visited = [] as FieldName[], focused = null as FieldName | null } = {},
) {
  const { fields } = evaluateForm({ ...EMPTY, ...values });
  return Object.fromEntries(
    FIELD_NAMES.map((name) => [
      name,
      visibleError(fields[name], { visited: visited.includes(name), focused: focused === name }),
    ]),
  ) as Record<FieldName, string | null>;
}

/** Typing `text` into `field` one character at a time, with the cursor staying in the field. */
function typeCharByChar(field: FieldName, text: string, others: Partial<FormValues>) {
  return [...text].map((_, i) => {
    const typed = text.slice(0, i + 1);
    const values = { ...others, [field]: typed };
    return {
      typed,
      error: errors(values, { visited: [field], focused: field })[field],
      result: results(values),
    };
  });
}

const NO_ERRORS = { subtotal: null, taxRate: null, tipRate: null, people: null };
const MAIN_EXAMPLE = { subtotal: '100.00', taxRate: '8.875', tipRate: '18', people: '3' };
const VALID_OTHERS = { taxRate: '8.875', tipRate: '18', people: '3', subtotal: '100.00' };

describe('S-1 See my exact share as I enter the bill', () => {
  it('AC1 app opens: empty fields, no errors, no result, hint shown', () => {
    expect(evaluateForm(EMPTY).split).toBeNull();
    expect(errors(EMPTY)).toEqual(NO_ERRORS);
    expect(NO_RESULT_HINT).toBe(
      'Enter the subtotal, tax, tip and number of people to see the split.',
    );
  });

  it('AC2 partly filled: no result and no errors for unvisited fields', () => {
    const values = { subtotal: '100.00', taxRate: '8.875' };
    expect(results(values)).toBeNull();
    expect(errors(values, { visited: ['subtotal'], focused: 'taxRate' })).toEqual(NO_ERRORS);
  });

  it('AC3 main example: totals, tax rounded half up, tip on the subtotal', () => {
    expect(results(MAIN_EXAMPLE)).toMatchObject({
      subtotal: '$100.00',
      tax: '$8.88',
      tip: '$18.00',
      total: '$126.88',
    });
  });

  it('AC4 main example: shares add up exactly to the total', () => {
    const { split } = evaluateForm(MAIN_EXAMPLE);
    expect(results(MAIN_EXAMPLE)?.shares).toEqual([
      'Person 1 (paid the bill): $42.30',
      'Persons 2–3: $42.29 each',
    ]);
    expect(split!.payerShare + 2n * split!.baseShare).toBe(split!.total);
  });

  it('AC5 changing people from 3 to 4 updates the result', () => {
    expect(results({ ...MAIN_EXAMPLE, people: '4' })).toMatchObject({
      total: '$126.88',
      shares: ['Person 1 (paid the bill): $31.72', 'Persons 2–4: $31.72 each'],
    });
  });

  it('AC6 changing the tip from 18 to 20 updates the result', () => {
    expect(results({ ...MAIN_EXAMPLE, tipRate: '20' })).toMatchObject({
      tip: '$20.00',
      total: '$128.88',
      shares: ['Person 1 (paid the bill): $42.96', 'Persons 2–3: $42.96 each'],
    });
  });

  it('AC7 no tax or tip: total equals the subtotal', () => {
    expect(results({ subtotal: '90.00', taxRate: '0', tipRate: '0', people: '3' })).toMatchObject({
      tax: '$0.00',
      tip: '$0.00',
      total: '$90.00',
      shares: ['Person 1 (paid the bill): $30.00', 'Persons 2–3: $30.00 each'],
    });
  });
});

describe('S-2 See how much to collect from the others', () => {
  it('AC1 main example: amount to collect is total minus Person 1', () => {
    expect(results(MAIN_EXAMPLE)?.collect).toBe('$84.58');
  });

  it('AC2 one leftover cent goes to Person 1', () => {
    expect(results({ subtotal: '100.00', taxRate: '0', tipRate: '0', people: '3' })).toMatchObject({
      shares: ['Person 1 (paid the bill): $33.34', 'Persons 2–3: $33.33 each'],
      collect: '$66.66',
    });
  });

  it('AC3 two leftover cents both go to Person 1', () => {
    expect(results({ subtotal: '100.01', taxRate: '0', tipRate: '0', people: '3' })).toMatchObject({
      shares: ['Person 1 (paid the bill): $33.35', 'Persons 2–3: $33.33 each'],
      collect: '$66.66',
    });
  });

  it('AC4 four leftover cents all go to Person 1', () => {
    const values = { subtotal: '100.00', taxRate: '0', tipRate: '0', people: '7' };
    expect(results(values)).toMatchObject({
      shares: ['Person 1 (paid the bill): $14.32', 'Persons 2–7: $14.28 each'],
      collect: '$85.68',
    });
    const { split } = evaluateForm(values);
    expect(split!.payerShare + 6n * split!.baseShare).toBe(10000n);
  });

  it('AC5 total divides evenly', () => {
    expect(results({ subtotal: '90.00', taxRate: '0', tipRate: '0', people: '3' })).toMatchObject({
      shares: ['Person 1 (paid the bill): $30.00', 'Persons 2–3: $30.00 each'],
      collect: '$60.00',
    });
  });

  it('AC6 one person: whole bill is their share, nothing to collect', () => {
    expect(results({ ...MAIN_EXAMPLE, people: '1' })).toMatchObject({
      shares: ['Person 1 (paid the bill): $126.88'],
      collect: '$0.00',
    });
  });
});

describe('S-3 Calculate any bill within the supported limits', () => {
  it('AC1 smallest subtotal', () => {
    expect(results({ subtotal: '0.01', taxRate: '0', tipRate: '0', people: '1' })).toMatchObject({
      total: '$0.01',
      shares: ['Person 1 (paid the bill): $0.01'],
      collect: '$0.00',
    });
  });

  it('AC2 tiny bill: tax and tip round to zero cents', () => {
    expect(results({ ...MAIN_EXAMPLE, subtotal: '0.01' })).toEqual({
      subtotal: '$0.01',
      tax: '$0.00',
      tip: '$0.00',
      total: '$0.01',
      shares: ['Person 1 (paid the bill): $0.01', 'Persons 2–3: $0.00 each'],
      collect: '$0.00',
    });
  });

  it('AC3 every input at its maximum', () => {
    const values = { subtotal: '999999.99', taxRate: '30', tipRate: '100', people: '100' };
    expect(results(values)).toEqual({
      subtotal: '$999,999.99',
      tax: '$300,000.00',
      tip: '$999,999.99',
      total: '$2,299,999.98',
      shares: ['Person 1 (paid the bill): $23,000.97', 'Persons 2–100: $22,999.99 each'],
      collect: '$2,276,999.01',
    });
    const { split } = evaluateForm(values);
    expect(split!.payerShare - split!.baseShare).toBe(98n);
    expect(split!.payerShare + 99n * split!.baseShare).toBe(split!.total);
  });

  it('AC4 maximum tax and tip, two people', () => {
    expect(results({ subtotal: '10.00', taxRate: '30', tipRate: '100', people: '2' })).toMatchObject(
      {
        tax: '$3.00',
        tip: '$10.00',
        total: '$23.00',
        shares: ['Person 1 (paid the bill): $11.50', 'Person 2: $11.50'],
      },
    );
  });

  it('AC5 subtotal over the limit', () => {
    const values = { ...VALID_OTHERS, subtotal: '1000000' };
    expect(errors(values).subtotal).toBe("Subtotal can't be more than $999,999.99.");
    expect(results(values)).toBeNull();
  });

  it('AC6 tax over the limit', () => {
    const values = { ...VALID_OTHERS, taxRate: '30.001' };
    expect(errors(values).taxRate).toBe("Tax rate can't be more than 30%.");
    expect(results(values)).toBeNull();
  });

  it('AC7 tip over the limit', () => {
    const values = { ...VALID_OTHERS, tipRate: '100.001' };
    expect(errors(values).tipRate).toBe("Tip rate can't be more than 100%.");
    expect(results(values)).toBeNull();
  });

  it('AC8 too many people', () => {
    const values = { ...VALID_OTHERS, people: '101' };
    expect(errors(values).people).toBe("Number of people can't be more than 100.");
    expect(results(values)).toBeNull();
  });

  it('AC9 three decimal places in a rate are accepted', () => {
    expect(errors({ ...VALID_OTHERS, taxRate: '8.875' }).taxRate).toBeNull();
    expect(results({ ...VALID_OTHERS, taxRate: '8.875' })).not.toBeNull();
  });

  it('AC10 decimal comma gives the same results as a decimal point', () => {
    const withComma = results({ subtotal: '100,00', taxRate: '8,875', tipRate: '18', people: '3' });
    expect(withComma).toEqual(results(MAIN_EXAMPLE));
    expect(withComma).toMatchObject({
      tax: '$8.88',
      total: '$126.88',
      shares: ['Person 1 (paid the bill): $42.30', 'Persons 2–3: $42.29 each'],
    });
  });

  it('AC11 no leading zero: .5 is $0.50', () => {
    expect(results({ subtotal: '.5', taxRate: '0', tipRate: '0', people: '1' })?.subtotal).toBe(
      '$0.50',
    );
  });

  it('AC12 spaces around a value are ignored', () => {
    expect(
      results({ subtotal: '  12.50  ', taxRate: '0', tipRate: '0', people: '1' })?.subtotal,
    ).toBe('$12.50');
  });
});

describe('S-4 Get a clear message for invalid input, and recover from it', () => {
  const cases: [number, string, Partial<FormValues>, FieldName, string][] = [
    [1, 'too many decimals in the subtotal', { subtotal: '12.345' }, 'subtotal', 'Subtotal can have at most 2 decimal places.'],
    [2, 'too many decimals in a rate', { taxRate: '8.8755' }, 'taxRate', 'Tax rate can have at most 3 decimal places.'],
    [3, 'comma as a thousands separator', { subtotal: '1,000' }, 'subtotal', "Don't use thousands separators. Use one decimal point or comma, for example 1000.50."],
    [4, 'comma and point together', { subtotal: '1,000.00' }, 'subtotal', "Don't use thousands separators. Use one decimal point or comma, for example 1000.50."],
    [5, 'dollar sign', { subtotal: '$12' }, 'subtotal', 'Use only digits and a decimal point or comma, for example 84.50.'],
    [6, 'scientific notation in the subtotal', { subtotal: '1e3' }, 'subtotal', 'Use only digits and a decimal point or comma, for example 84.50.'],
    [6, 'scientific notation in people', { people: '1e3' }, 'people', 'Use a whole number of people, for example 4.'],
    [7, 'negative subtotal', { subtotal: '-5' }, 'subtotal', "Subtotal can't be negative."],
    [7, 'negative tax', { taxRate: '-1' }, 'taxRate', "Tax rate can't be negative."],
    [7, 'negative tip', { tipRate: '-10' }, 'tipRate', "Tip rate can't be negative."],
    [7, 'negative people', { people: '-2' }, 'people', 'Number of people must be at least 1.'],
    [9, 'zero people', { people: '0' }, 'people', 'Number of people must be at least 1.'],
    [10, 'fractional people', { people: '2.5' }, 'people', 'Use a whole number of people, for example 4.'],
  ];

  it.each(cases)('AC%i %s: message shown immediately, no result', (_, __, change, field, message) => {
    const values = { ...VALID_OTHERS, ...change };
    // Shown immediately: even while the cursor is still in the field.
    expect(errors(values, { focused: field })[field]).toBe(message);
    expect(results(values)).toBeNull();
  });

  it('AC1 12.345 is not changed to 12.35', () => {
    expect(evaluateForm({ ...VALID_OTHERS, subtotal: '12.345' }).fields.subtotal.status).toBe(
      'invalid',
    );
  });

  it('AC3 1,000 is not read as 1000 or as 1.000', () => {
    expect(evaluateForm({ ...VALID_OTHERS, subtotal: '1,000' }).fields.subtotal.status).toBe(
      'invalid',
    );
  });

  it('AC8 empty field: message after tapping in and leaving without typing', () => {
    const values = { ...VALID_OTHERS, tipRate: '' };
    expect(errors(values, { focused: 'tipRate' }).tipRate).toBeNull();
    expect(errors(values, { visited: ['tipRate'] }).tipRate).toBe(
      'Enter the tip rate (use 0 for no tip).',
    );
    expect(results(values)).toBeNull();

    const visitedEmpty = errors(EMPTY, { visited: [...FIELD_NAMES] });
    expect(visitedEmpty).toEqual({
      subtotal: 'Enter the subtotal.',
      taxRate: 'Enter the tax rate (use 0 for no tax).',
      tipRate: 'Enter the tip rate (use 0 for no tip).',
      people: 'Enter the number of people.',
    });
  });

  it('AC11 zero subtotal: message after leaving the field', () => {
    const values = { ...VALID_OTHERS, subtotal: '0' };
    expect(errors(values, { visited: ['subtotal'], focused: 'subtotal' }).subtotal).toBeNull();
    expect(errors(values, { visited: ['subtotal'] }).subtotal).toBe(
      'Subtotal must be at least $0.01.',
    );
    expect(results(values)).toBeNull();
  });

  it('AC12 several invalid fields: each shows its own message, text unchanged', () => {
    const values = { subtotal: '12.345', taxRate: '-1', tipRate: '18', people: '0' };
    const before = { ...values };
    expect(errors(values)).toEqual({
      subtotal: 'Subtotal can have at most 2 decimal places.',
      taxRate: "Tax rate can't be negative.",
      tipRate: null,
      people: 'Number of people must be at least 1.',
    });
    expect(results(values)).toBeNull();
    expect(values).toEqual(before);
  });

  it('AC13 a result disappears when an input becomes invalid', () => {
    expect(results(MAIN_EXAMPLE)).not.toBeNull();
    const changed = { ...MAIN_EXAMPLE, people: '0' };
    expect(results(changed)).toBeNull();
    expect(errors(changed, { focused: 'people' }).people).toBe(
      'Number of people must be at least 1.',
    );
  });

  it('AC14 fixing the people field brings the result back', () => {
    const fixed = { ...MAIN_EXAMPLE, people: '4' };
    expect(errors(fixed, { focused: 'people' })).toEqual(NO_ERRORS);
    expect(results(fixed)).toMatchObject({
      shares: ['Person 1 (paid the bill): $31.72', 'Persons 2–4: $31.72 each'],
      collect: '$95.16',
    });
  });

  it('AC15 fixing the subtotal brings the result back', () => {
    const broken = { ...MAIN_EXAMPLE, subtotal: '12.345' };
    expect(results(broken)).toBeNull();
    const fixed = { ...MAIN_EXAMPLE, subtotal: '12.34' };
    expect(errors(fixed, { focused: 'subtotal' })).toEqual(NO_ERRORS);
    expect(results(fixed)).toEqual({
      subtotal: '$12.34',
      tax: '$1.10',
      tip: '$2.22',
      total: '$15.66',
      shares: ['Person 1 (paid the bill): $5.22', 'Persons 2–3: $5.22 each'],
      collect: '$10.44',
    });
  });

  it.each(['12.50', '12,50'])('AC16 typing %s one character at a time never shows an error', (text) => {
    const steps = typeCharByChar('subtotal', text, { taxRate: '0', tipRate: '0', people: '2' });
    expect(steps.map((s) => s.error)).toEqual([null, null, null, null, null]);
    expect(steps.map((s) => s.result && [s.result.total, s.result.shares[1]])).toEqual([
      ['$1.00', 'Person 2: $0.50'],
      ['$12.00', 'Person 2: $6.00'],
      ['$12.00', 'Person 2: $6.00'],
      ['$12.50', 'Person 2: $6.25'],
      ['$12.50', 'Person 2: $6.25'],
    ]);
  });

  it.each(['.', ','])('AC17 a lone %s: no error while typing, message after leaving', (text) => {
    const values = { ...VALID_OTHERS, subtotal: text };
    expect(errors(values, { focused: 'subtotal' }).subtotal).toBeNull();
    expect(results(values)).toBeNull();
    expect(errors(values, { visited: ['subtotal'] }).subtotal).toBe(
      'Use only digits and a decimal point or comma, for example 84.50.',
    );
  });

  it('AC18 typing a small subtotal never shows an error', () => {
    const steps = typeCharByChar('subtotal', '0.05', { taxRate: '0', tipRate: '0', people: '1' });
    expect(steps.map((s) => s.error)).toEqual([null, null, null, null]);
    expect(steps.map((s) => s.result?.total ?? null)).toEqual([null, null, null, '$0.05']);
  });

  it('AC19 clearing a field removes the result, error waits until leaving', () => {
    const cleared = { ...MAIN_EXAMPLE, subtotal: '' };
    expect(results(cleared)).toBeNull();
    expect(errors(cleared, { visited: ['subtotal'], focused: 'subtotal' }).subtotal).toBeNull();
    expect(errors(cleared, { visited: ['subtotal'] }).subtotal).toBe('Enter the subtotal.');
  });
});

describe('Not implemented stories', () => {
  it.todo('S-5 Enter tax as the amount printed on the receipt');
  it.todo('S-6 Copy the breakdown to send to the group');
});
