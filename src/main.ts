/**
 * Browser UI. All calculation, parsing and wording comes from the pure modules in ./core;
 * this file only reads the inputs, tracks focus, and writes the results to the page.
 */
import './style.css';
import {
  evaluateForm,
  FIELD_NAMES,
  NO_RESULT_HINT,
  visibleError,
  type FieldName,
  type FormValues,
} from './core/form.ts';
import { describeSplit, formatCents, shareLines } from './core/format.ts';
import type { Split } from './core/split.ts';

/** Wait for a pause in typing before announcing, so screen readers aren't flooded per keystroke. */
const ANNOUNCE_DELAY_MS = 750;

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
}

const form = byId<HTMLFormElement>('bill-form');
const fields = Object.fromEntries(
  FIELD_NAMES.map((name) => [
    name,
    {
      input: byId<HTMLInputElement>(name),
      hint: byId<HTMLElement>(`${name}-hint`),
      error: byId<HTMLElement>(`${name}-error`),
    },
  ]),
) as Record<FieldName, { input: HTMLInputElement; hint: HTMLElement; error: HTMLElement }>;

const resultsEmpty = byId('results-empty');
const resultsBody = byId('results-body');
const output = {
  subtotal: byId('out-subtotal'),
  tax: byId('out-tax'),
  tip: byId('out-tip'),
  total: byId('out-total'),
  shares: byId<HTMLUListElement>('out-shares'),
  collect: byId('out-collect'),
};
const announcer = byId('announcer');

const visited = new Set<FieldName>();
let focused: FieldName | null = null;
let announceTimer: number | undefined;
// The page opens showing the hint, so there is nothing to announce until something changes.
let lastAnnouncement = NO_RESULT_HINT;

function readValues(): FormValues {
  return Object.fromEntries(
    FIELD_NAMES.map((name) => [name, fields[name].input.value]),
  ) as FormValues;
}

function renderFieldError(name: FieldName, message: string | null): void {
  const { input, hint, error } = fields[name];
  error.textContent = message ?? '';
  error.hidden = message === null;
  // Link the message to its field so screen readers read it with the field.
  input.setAttribute('aria-describedby', message === null ? hint.id : `${error.id} ${hint.id}`);
  if (message === null) input.removeAttribute('aria-invalid');
  else input.setAttribute('aria-invalid', 'true');
}

function renderSplit(split: Split | null): void {
  resultsEmpty.hidden = split !== null;
  resultsBody.hidden = split === null;
  if (!split) return;

  output.subtotal.textContent = formatCents(split.subtotal);
  output.tax.textContent = formatCents(split.tax);
  output.tip.textContent = formatCents(split.tip);
  output.total.textContent = formatCents(split.total);
  output.collect.textContent = formatCents(split.amountToCollect);
  output.shares.replaceChildren(
    ...shareLines(split).map((line, index) => {
      const item = document.createElement('li');
      if (index === 0) item.className = 'payer';
      const label = document.createElement('span');
      label.className = 'share-label';
      label.textContent = `${line.label}:`;
      const amount = document.createElement('span');
      amount.className = 'share-amount';
      amount.textContent = line.amount;
      item.append(label, ' ', amount);
      return item;
    }),
  );
}

function announce(text: string): void {
  window.clearTimeout(announceTimer);
  if (text === lastAnnouncement) return;
  announceTimer = window.setTimeout(() => {
    announcer.textContent = text;
    lastAnnouncement = text;
  }, ANNOUNCE_DELAY_MS);
}

function render(): void {
  const evaluation = evaluateForm(readValues());

  const messages: string[] = [];
  for (const name of FIELD_NAMES) {
    const message = visibleError(evaluation.fields[name], {
      visited: visited.has(name),
      focused: focused === name,
    });
    renderFieldError(name, message);
    if (message) messages.push(message);
  }

  renderSplit(evaluation.split);

  if (evaluation.split) announce(describeSplit(evaluation.split));
  else if (messages.length > 0) announce(`No result. ${messages.join(' ')}`);
  else announce(NO_RESULT_HINT);
}

for (const [index, name] of FIELD_NAMES.entries()) {
  const { input } = fields[name];
  input.addEventListener('input', render);
  input.addEventListener('focus', () => {
    focused = name;
    render();
  });
  input.addEventListener('blur', () => {
    visited.add(name);
    if (focused === name) focused = null;
    render();
  });
  // Enter moves to the next field, like the "next" key on a phone keyboard.
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const next = FIELD_NAMES[index + 1];
    if (next) fields[next].input.focus();
    else input.blur();
  });
}

// There is nothing to submit: results update live.
form.addEventListener('submit', (event) => event.preventDefault());

resultsEmpty.textContent = NO_RESULT_HINT;
render();
