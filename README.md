# Bill Splitter

A web app that splits a restaurant bill equally, with tax and tip included, exact to the cent. You enter the subtotal, tax rate, tip rate and number of people. Results update as you type: the tax, tip and total, what each person owes, and how much the person who paid needs to collect from everyone else.

## Who it is for and why a bill splitter

It is for a **Group Diner**: someone at a restaurant table at the end of a shared meal, phone in hand, whose group has agreed to split the bill equally. On a given night they are in one of two situations:

- **They paid the whole bill** and need to know how much to collect from the others (job J-1).
- **Someone else paid** and they need to know their exact share (job J-2).

I chose a bill splitter because it is a small calculator with a real person, a real situation and a real correctness problem. The hard part isn't the arithmetic; it's making the displayed numbers trustworthy. Tax and tip have to be rounded to the cent, the total rarely divides evenly between people, and the shares people read out at the table must add up to exactly the total, with no missing or extra cent. A small app where that is specified and tested fits the 2–4 hour scope better than a large calculator.

The product documents explain the reasoning in full:

- [docs/app-roles.md](docs/app-roles.md): one role, the Group Diner. It also explains why separate Payer and Participant roles were considered and rejected.
- [docs/jobs-to-be-done.md](docs/jobs-to-be-done.md): two jobs, J-1 (collect what I'm owed) and J-2 (pay back my exact part).
- [docs/user-stories.md](docs/user-stories.md): six stories with Given/When/Then acceptance criteria. S-1 to S-4 are Implemented; S-5 and S-6 are Not implemented.

### Technology choice

I'm a mobile apps engineer and considered building this in Flutter Web. I chose Vite and plain TypeScript instead to remove setup risk for the reviewer. It needs only Node.js, installs three dev dependencies (Vite, TypeScript and Vitest), and runs in any current browser with no SDK or toolchain to install. The layout is mobile first, because the app is used at the table, and it scales up to a two-column layout on desktop.

## Prerequisites

- **Node.js 20.19 or higher, or 22.12 or higher.** Node 22 LTS is recommended, and `.nvmrc` is set to 22.
  - Vite 8 requires at least Node 20.19 or 22.12.
  - Vitest is kept on version 4, because Vitest 5 dropped Node 20.
  - The project was tested on Node 20.20.2, 22.23.3 and 24.18.0.
- **npm**, which comes with Node.js.
- **A current version of Chrome, Edge, Firefox or Safari.**

No accounts, API keys, cloud services or network access are needed at runtime.

## Install and run

From the project root:

```bash
npm install
```

```bash
npm run dev
```

Then open the URL Vite prints, normally http://localhost:5173.

**About the `fsevents` warning.** `npm install` may print a warning about `fsevents`. It is expected and harmless. `fsevents` is an optional macOS-only file-watching package that the build tools list as an optional dependency, and npm notes it while installing or skipping it.

To build and serve the production version instead:

```bash
npm run build
```

```bash
npm run preview
```

## Tests

```bash
npm test
```

This runs 167 Vitest tests and lists 2 as to-do: S-5 and S-6, the two stories marked Not implemented. The tests cover the pure core in `src/core/`. They don't drive the browser; the UI was checked by hand in the browser and on a phone.

- **`acceptance.test.ts`** runs every acceptance criterion of S-1 to S-4 through the same functions the UI uses. Each test is named after its story and criterion, for example `S-2 … AC3`, so it can be traced back to the document. The checks include:
  - exact displayed amounts
  - exact error messages
  - which errors wait until the user leaves a field
  - typing a value one character at a time
  - recovering after an error
- **`split.test.ts`** checks the rules that must hold for every bill, over about 52,000 inputs: every combination of boundary values plus seeded random values across the full range.
  - The shares add up exactly to the total.
  - Subtotal + tax + tip equals the total.
  - Amount to collect = total − Person 1's share = base share × (people − 1).
  - Person 1 pays fewer than N extra cents.
  - Tax and tip are rounded half up. This is checked independently of the production formula.
  - No amount is negative, and the results are deterministic.
- **`parse.test.ts`** checks every row of the error message table, accepted input formats (point or comma, `.5`, `12.`, spaces), and that every cent amount is read back exactly.
- **`format.test.ts`** checks the money formatting, the share lines and the screen reader announcement.

`npm run test:watch` runs the tests in watch mode. `npm run typecheck` runs the TypeScript compiler.

## Project structure

```
index.html            Page markup: form, labels, hints, error slots, results
src/main.ts           Browser UI only: reads inputs, tracks focus, renders results
src/style.css         Mobile-first styles, light and dark themes
src/core/parse.ts     Field text → exact whole numbers, or the error message to show
src/core/split.ts     The calculation in whole cents (BigInt)
src/core/format.ts    Cents → "$1,234.56", share lines, screen reader summary
src/core/form.ts      Combines the four fields; decides which errors are visible
src/core/*.test.ts    Vitest tests
docs/                 App roles, Jobs To Be Done, user stories
transcripts/          Claude Code session transcripts
```

All calculation and input rules are in `src/core/`, which has no DOM code, so they can be tested without a browser.

## AI tool and model

- **Tool:** Claude Code (desktop app, Code tab)
- **Model:** Claude Opus 5.5, on High effort

The product rules, the three product documents and the code were developed in one session. I set the requirements, approved or corrected each step, and tested the result by hand on a Mac and a phone. The full transcript is in [transcripts/](transcripts/).

## Code changed by hand

None. All code was written by Claude Code. I directed and reviewed the changes and tested the app manually.

## Assumptions

These are the product rules approved before coding. Each one is also captured in the acceptance criteria in [docs/user-stories.md](docs/user-stories.md).

### Splitting the bill

- **Equal splits only.** Uneven and item-level splits are out of scope.
- **The number of people includes the person who paid**, who is always shown as **Person 1**.
- **Tax is calculated on the subtotal.** It may differ by a cent from a receipt where the restaurant taxed each item separately. Entering tax as the printed amount is story S-5, Not implemented.
- **Tip is calculated on the subtotal before tax**, not on subtotal plus tax.
- **Tax and tip are each rounded half up to the cent, separately.** The total is the subtotal plus the rounded tax plus the rounded tip, so the displayed lines always add up.
- **The payer absorbs the leftover cents.** The total is divided by the number of people and rounded down to the cent; that's what Persons 2 to N each pay. All the cents left over go to Person 1.
  - So everyone who didn't pay owes one identical amount, and the payer covers at most N − 1 extra cents, never more than 99.
  - The amount to collect is always the base share × (N − 1).
- **Prices that already include tax, and bills with a service charge:** enter 0 for tax or tip.

### Entering numbers

- **No default values.** Tax and tip must be entered, and 0 is allowed. The app never assumes a rate.
- **Supported ranges:**
  - Subtotal: $0.01 to $999,999.99, up to 2 decimal places.
  - Tax: 0–30%, up to 3 decimals (for example 8.875%).
  - Tip: 0–100%, up to 3 decimals.
  - People: 1 to 100, whole numbers only.
- **Input is never silently rounded, cut short or reinterpreted.** For example, `12.345` is rejected, not turned into 12.35. Currency symbols, letters and scientific notation such as `1e3` are rejected with a message.
- **Decimal comma.** A point or a comma can be the decimal separator, so `12,50` means 12.50. This matters on mobile keyboards that only offer a comma.
  - A value can contain only one separator, so `1,000.00` is rejected.
  - In the subtotal, a comma followed by exactly three digits (`1,000`) is rejected with *Don't use thousands separators…*, because a subtotal never has three decimal places.
  - In the rate fields, a comma followed by three digits is a decimal, because rates allow three decimal places. `8,875` means 8.875%, so a tax rate typed as `1,000` is read as 1%.
  - `1.000` with a point is rejected as having too many decimal places.
- **Currency.** The app assumes a currency with two decimal places. Amounts are always displayed as `$1,234.56`, whichever separator was typed.

### Live updates

- **Results update on every keystroke.** There is no Calculate button. A result is shown only when all four fields are valid, and it disappears as soon as any field becomes empty or invalid.
- **Errors wait for part-typed values.** An empty field, a lone `.` or `,`, or a subtotal that is so far zero (`0`, `0.`) shows no error while the cursor is in the field. Its error appears when the user leaves the field. All other invalid input shows its error immediately.

### Not in scope

Accounts, saved bills, persistence across reloads, a backend, network access, payments, sharing, receipt scanning and uneven splits. Nothing typed leaves the device.

### Technical note: why BigInt

All money is handled as whole cents, and rates as whole thousandths of a percent. Text is read straight into integers, never through `parseFloat` or `Number()`, and amounts are formatted from the integers too.

**Ordinary JavaScript `Number` would also have been exact within these limits.**

- The largest intermediate value is about 2 × 10¹³, about 450 times below `Number.MAX_SAFE_INTEGER`.
- A comparison run during the session over 3.2 million inputs found no differences between `Number` and BigInt.

**BigInt was chosen to make exactness enforced by the language, not by discipline.**

- BigInt division cannot produce a fraction.
- Mixing BigInt with an ordinary `Number` is a TypeScript error and a runtime error.
- So if a limit is raised later, or someone adds a fractional step, the code fails loudly instead of quietly producing a wrong cent.
- The cost is a few conversions at the edges. BigInt is supported in all current browsers.

## Extras beyond the acceptance criteria

- **Accessible fields.** Every field has a visible label and a short hint, both linked to the input. When there's an error, the input gets `aria-invalid` and the message is linked with `aria-describedby`.
- **Screen reader announcements.** Results and errors are announced through a hidden `role="status"` live region, 750 ms after the user stops typing, so screen readers aren't flooded on every keystroke. The visible results still update immediately.
- **Mobile keyboards.** Subtotal, tax and tip use `inputmode="decimal"`. Number of people uses `inputmode="numeric"`, because it only accepts whole numbers.
- **Enter key.** Enter moves to the next field, like the "next" key on a phone keyboard.
- **Placeholders.** They show the allowed range (`0–30`, `0–100`, `1–100`), not example values, so tax and tip never look pre-filled.
- **Themes.** Light and dark themes follow the system setting.
