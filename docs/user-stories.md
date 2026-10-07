# User Stories with Acceptance Criteria

Every story belongs to the **Group Diner** role ([app-roles.md](app-roles.md)) and names the job it serves ([jobs-to-be-done.md](jobs-to-be-done.md)):

- **J-1:** collect what I am owed after paying for the group.
- **J-2:** pay back my exact part when someone else paid.

| Story | Title | Serves | Status |
|---|---|---|---|
| S-1 | See my exact share as I enter the bill | J-2 | Implemented |
| S-2 | See how much to collect from the others | J-1 | Implemented |
| S-3 | Calculate any bill within the supported limits | J-1, J-2 | Implemented |
| S-4 | Get a clear message for invalid input, and recover from it | J-1, J-2 | Implemented |
| S-5 | Enter tax as the amount printed on the receipt | J-1, J-2 | Not implemented |
| S-6 | Copy the breakdown to send to the group | J-1 | Not implemented |

## Rules used in the acceptance criteria

These rules apply to every criterion below.

**Inputs.** There are four fields: **Subtotal**, **Tax rate (%)**, **Tip rate (%)** and **Number of people**. All four start empty. There are no default values.

**Decimal separator.**

- A decimal can be typed with a point or a comma, so `12.50` and `12,50` mean the same. This lets people type on mobile keyboards that only offer a comma.
- A value may contain at most one separator.
- In the subtotal, a comma followed by exactly three digits (such as `1,000`) is treated as a thousands separator and rejected. A subtotal never has three decimal places.
- In the rate fields, a comma followed by three digits is a decimal, because rates allow three decimal places. So `8,875` means 8.875%.

**Calculation.** All amounts are calculated in whole cents.

1. Tax = subtotal × tax rate, rounded half up to the cent.
2. Tip = subtotal × tip rate, rounded half up to the cent. Tip is calculated on the subtotal before tax.
3. Total = subtotal + rounded tax + rounded tip.
4. Base share = total ÷ number of people, rounded down to the cent. Persons 2 to N each pay the base share.
5. Person 1 is the person who paid the bill. The number of people includes them. Person 1's share is the base share plus all the leftover cents. There are always fewer leftover cents than people, so Person 1 pays at most N − 1 cents more than everyone else.
6. Amount to collect from others = total − Person 1's share. This always equals the base share × (N − 1).

**Results.**

- The results show **Subtotal**, **Tax**, **Tip**, **Total**, each person's share, and **Amount to collect from others**.
- Amounts are always shown with a `$` sign, comma thousands separators and exactly two decimal places, for example `$2,299,999.98`. This is the same whichever decimal separator was typed.
- Shares are listed in one of two ways:
  - `Person 1 (paid the bill): $X`, followed by `Persons 2–N: $Y each` when there are three or more people.
  - `Person 1 (paid the bill): $X`, followed by `Person 2: $Y` when there are two people.
- The results area always has the heading **The split**. When there is no result, the only other thing it shows is: *Enter the subtotal, tax, tip and number of people to see the split.*

**Live updates.** There is no Calculate button. The results update on every change to any field.

**When errors appear.**

- An error message appears under the field it belongs to.
- A value ending in a separator, such as `12.` or `12,`, is read as a whole number (12.00), so typing a decimal never shows an error part-way.
- These values may be part-way through valid typing, so they show **no error while the cursor is still in the field**:
  - an empty field
  - a lone `.` or `,`
  - a subtotal that is so far zero, such as `0`, `0.`, `0,` or `0.0`

  The matching error appears when the user leaves the field. Every other invalid value shows its error immediately.
- Whenever any field is empty or invalid, no result is shown.

## S-1: See my exact share as I enter the bill

**Serves:** J-2 · **Status:** Implemented

As a Group Diner, I want to see the tax, tip, total and each person's share as soon as I enter the bill details, so that I know exactly what I owe the person who paid.

**Acceptance criteria**

1. **App opens.** Given the app is not open, when I open it, then all four fields are empty, no error messages are shown, no results are shown, and the results area shows only the heading **The split** and *Enter the subtotal, tax, tip and number of people to see the split.*
2. **Partly filled.** Given the app has just opened, when I enter only subtotal `100.00` and tax `8.875`, then no results are shown and no errors are shown for the tip and people fields I have not visited.
3. **Main example, totals.** Given the form is empty, when I enter subtotal `100.00`, tax `8.875`, tip `18` and people `3`, then, without pressing any button, I see:
   - Subtotal $100.00
   - Tax $8.88 (8.875 cents is rounded half up)
   - Tip $18.00 (tip on the subtotal; tip on subtotal plus tax would have been $19.60)
   - Total $126.88, which equals $100.00 + $8.88 + $18.00
4. **Main example, shares.** Given the form is empty, when I enter subtotal `100.00`, tax `8.875`, tip `18` and people `3`, then I see `Person 1 (paid the bill): $42.30` and `Persons 2–3: $42.29 each`, and $42.30 + $42.29 + $42.29 = $126.88, exactly the displayed total.
5. **Changing the number of people.** Given the result from criterion 3 is shown, when I change people from `3` to `4`, then the result updates immediately to `Person 1 (paid the bill): $31.72` and `Persons 2–4: $31.72 each`, still totalling $126.88.
6. **Changing the tip.** Given the result from criterion 3 is shown, when I change the tip from `18` to `20`, then the result updates immediately to Tip $20.00, Total $128.88, `Person 1 (paid the bill): $42.96` and `Persons 2–3: $42.96 each`.
7. **No tax or tip.** Given the form is empty, when I enter subtotal `90.00`, tax `0`, tip `0` and people `3`, then I see Tax $0.00, Tip $0.00, Total $90.00, `Person 1 (paid the bill): $30.00` and `Persons 2–3: $30.00 each`.

## S-2: See how much to collect from the others

**Serves:** J-1 · **Status:** Implemented

As a Group Diner who paid the bill, I want to see how much I need to collect from everyone else and what each of them owes, so that I get back exactly what I paid beyond my own part.

**Acceptance criteria**

1. **Main example.** Given the form is empty, when I enter subtotal `100.00`, tax `8.875`, tip `18` and people `3`, then I see Amount to collect from others $84.58. This is the total of $126.88 minus Person 1's $42.30, which equals 2 × $42.29.
2. **One leftover cent.** Given the form is empty, when I enter subtotal `100.00`, tax `0`, tip `0` and people `3`, then I see:
   - `Person 1 (paid the bill): $33.34`
   - `Persons 2–3: $33.33 each`
   - Amount to collect from others $66.66
3. **Two leftover cents, both to Person 1.** Given the form is empty, when I enter subtotal `100.01`, tax `0`, tip `0` and people `3`, then I see:
   - `Person 1 (paid the bill): $33.35`
   - `Persons 2–3: $33.33 each`
   - Amount to collect from others $66.66
4. **Four leftover cents, all to Person 1.** Given the form is empty, when I enter subtotal `100.00`, tax `0`, tip `0` and people `7`, then I see:
   - `Person 1 (paid the bill): $14.32`
   - `Persons 2–7: $14.28 each`
   - Amount to collect from others $85.68

   $14.32 + 6 × $14.28 = $100.00.
5. **Total divides evenly.** Given the form is empty, when I enter subtotal `90.00`, tax `0`, tip `0` and people `3`, then every share is $30.00 and Amount to collect from others is $60.00.
6. **One person.** Given the form is empty, when I enter subtotal `100.00`, tax `8.875`, tip `18` and people `1`, then I see `Person 1 (paid the bill): $126.88`, no other people are listed, and Amount to collect from others is $0.00.

## S-3: Calculate any bill within the supported limits

**Serves:** J-1, J-2 · **Status:** Implemented

As a Group Diner, I want any bill within the supported limits to be calculated exactly, whether it's a few cents or close to a million dollars, so that I can trust the result whatever the size of the bill.

The supported limits are:

| Field | Minimum | Maximum | Decimal places |
|---|---|---|---|
| Subtotal | 0.01 | 999,999.99 | up to 2 |
| Tax rate | 0 | 30 | up to 3 |
| Tip rate | 0 | 100 | up to 3 |
| Number of people | 1 | 100 | whole numbers only |

**Acceptance criteria**

1. **Smallest subtotal.** Given the form is empty, when I enter subtotal `0.01`, tax `0`, tip `0` and people `1`, then I see Total $0.01, `Person 1 (paid the bill): $0.01` and Amount to collect from others $0.00.
2. **Tiny bill with tax and tip.** Given the form is empty, when I enter subtotal `0.01`, tax `8.875`, tip `18` and people `3`, then I see:
   - Tax $0.00 and Tip $0.00 (both round to zero cents)
   - Total $0.01
   - `Person 1 (paid the bill): $0.01`
   - `Persons 2–3: $0.00 each`
   - Amount to collect from others $0.00
3. **Every input at its maximum.** Given the form is empty, when I enter subtotal `999999.99`, tax `30`, tip `100` and people `100`, then I see:
   - Tax $300,000.00
   - Tip $999,999.99
   - Total $2,299,999.98
   - `Person 1 (paid the bill): $23,000.97`, which includes 98 leftover cents
   - `Persons 2–100: $22,999.99 each`
   - Amount to collect from others $2,276,999.01

   $23,000.97 + 99 × $22,999.99 = $2,299,999.98.
4. **Maximum tax and tip, two people.** Given the form is empty, when I enter subtotal `10.00`, tax `30`, tip `100` and people `2`, then I see Tax $3.00, Tip $10.00, Total $23.00, `Person 1 (paid the bill): $11.50` and `Person 2: $11.50`.
5. **Subtotal over the limit.** Given the other three fields hold valid values, when I enter subtotal `1000000`, then I see *Subtotal can't be more than $999,999.99.* and no result.
6. **Tax over the limit.** Given the other three fields hold valid values, when I enter tax `30.001`, then I see *Tax rate can't be more than 30%.* and no result.
7. **Tip over the limit.** Given the other three fields hold valid values, when I enter tip `100.001`, then I see *Tip rate can't be more than 100%.* and no result.
8. **Too many people.** Given the other three fields hold valid values, when I enter people `101`, then I see *Number of people can't be more than 100.* and no result.
9. **Three decimal places in a rate.** Given the other three fields hold valid values, when I enter tax `8.875`, then it is accepted with no error.
10. **Decimal comma.** Given the form is empty, when I enter subtotal `100,00`, tax `8,875`, tip `18` and people `3`, then I see the same results as with `100.00` and `8.875`: Tax $8.88, Total $126.88, `Person 1 (paid the bill): $42.30` and `Persons 2–3: $42.29 each`.
11. **No leading zero.** Given tax `0`, tip `0` and people `1`, when I enter subtotal `.5`, then the subtotal is accepted as $0.50.
12. **Spaces around a value.** Given tax `0`, tip `0` and people `1`, when I enter subtotal `  12.50  ` with spaces before and after, then the spaces are ignored and the subtotal is $12.50.

## S-4: Get a clear message for invalid input, and recover from it

**Serves:** J-1, J-2 · **Status:** Implemented

As a Group Diner, I want a clear message telling me what to fix when something I entered isn't valid, and no result until it is, so that I never pass on a wrong amount to the group.

**Error messages.** Each field shows one message at a time. When several rules are broken, the first matching row in the field's list applies.

| Field | Input | Message |
|---|---|---|
| Subtotal | Empty (after leaving the field) | Enter the subtotal. |
| Subtotal | Starts with `-` | Subtotal can't be negative. |
| Subtotal | Contains anything other than digits, `.` and `,` (for example `$12`, `1e3`, `abc`), or is a lone `.` or `,` after leaving the field | Use only digits and a decimal point or comma, for example 84.50. |
| Subtotal | More than one `.` or `,` (for example `1,000.00`, `1.000,00`, `12.5.3`), or a comma followed by exactly three digits (for example `1,000`, `12,345`) | Don't use thousands separators. Use one decimal point or comma, for example 1000.50. |
| Subtotal | More than 2 decimal places (for example `12.345`, `12,3456`) | Subtotal can have at most 2 decimal places. |
| Subtotal | Zero (after leaving the field) | Subtotal must be at least $0.01. |
| Subtotal | Over 999,999.99 | Subtotal can't be more than $999,999.99. |
| Tax rate | Empty (after leaving the field) | Enter the tax rate (use 0 for no tax). |
| Tax rate | Starts with `-` | Tax rate can't be negative. |
| Tax rate | Contains anything other than digits, `.` and `,`, contains more than one `.` or `,`, or is a lone `.` or `,` after leaving the field | Use only digits and one decimal point or comma, for example 8.875. |
| Tax rate | More than 3 decimal places | Tax rate can have at most 3 decimal places. |
| Tax rate | Over 30 | Tax rate can't be more than 30%. |
| Tip rate | Empty (after leaving the field) | Enter the tip rate (use 0 for no tip). |
| Tip rate | Starts with `-` | Tip rate can't be negative. |
| Tip rate | Contains anything other than digits, `.` and `,`, contains more than one `.` or `,`, or is a lone `.` or `,` after leaving the field | Use only digits and one decimal point or comma, for example 18. |
| Tip rate | More than 3 decimal places | Tip rate can have at most 3 decimal places. |
| Tip rate | Over 100 | Tip rate can't be more than 100%. |
| Number of people | Empty (after leaving the field) | Enter the number of people. |
| Number of people | Starts with `-`, or is `0` | Number of people must be at least 1. |
| Number of people | Anything other than digits (for example `2.5`, `2,5`, `2.`, `1e3`, `1,000`) | Use a whole number of people, for example 4. |
| Number of people | Over 100 | Number of people can't be more than 100. |

**Acceptance criteria**

1. **Too many decimals in the subtotal.** Given the other three fields hold valid values, when I enter subtotal `12.345`, then I see *Subtotal can have at most 2 decimal places.* and no result. The value is not changed to 12.35.
2. **Too many decimals in a rate.** Given the other three fields hold valid values, when I enter tax `8.8755`, then I see *Tax rate can have at most 3 decimal places.* and no result.
3. **Comma as a thousands separator.** Given the other three fields hold valid values, when I enter subtotal `1,000`, then I see *Don't use thousands separators. Use one decimal point or comma, for example 1000.50.* and no result. The value is not read as 1000 or as 1.000.
4. **Comma and point together.** Given the other three fields hold valid values, when I enter subtotal `1,000.00`, then I see *Don't use thousands separators. Use one decimal point or comma, for example 1000.50.* and no result.
5. **Dollar sign.** Given the other three fields hold valid values, when I enter subtotal `$12`, then I see *Use only digits and a decimal point or comma, for example 84.50.* and no result.
6. **Scientific notation.** Given the other three fields hold valid values, when I enter subtotal `1e3`, then I see *Use only digits and a decimal point or comma, for example 84.50.* and no result. When I instead enter people `1e3`, then I see *Use a whole number of people, for example 4.* and no result.
7. **Negative values.** Given the other three fields hold valid values, when I enter a negative value, then I see the field's message and no result:
   - Subtotal `-5` → *Subtotal can't be negative.*
   - Tax `-1` → *Tax rate can't be negative.*
   - Tip `-10` → *Tip rate can't be negative.*
   - People `-2` → *Number of people must be at least 1.*
8. **Empty field.** Given the tip field is empty, when I click or tap into it and leave it without typing, then I see *Enter the tip rate (use 0 for no tip).* and no result. The same applies to each field with its own message from the table.
9. **Zero people.** Given the other three fields hold valid values, when I enter people `0`, then I see *Number of people must be at least 1.* immediately and no result.
10. **Fractional people.** Given the other three fields hold valid values, when I enter people `2.5`, then I see *Use a whole number of people, for example 4.* and no result.
11. **Zero subtotal.** Given the other three fields hold valid values, when I enter subtotal `0` and leave the field, then I see *Subtotal must be at least $0.01.* and no result.
12. **Several invalid fields.** Given the form is empty, when I enter subtotal `12.345`, tax `-1`, tip `18` and people `0`, then the subtotal, tax and people fields each show their own message, what I typed stays in every field unchanged, and no result is shown.
13. **A result disappears when an input becomes invalid.** Given a result is shown for subtotal `100.00`, tax `8.875`, tip `18` and people `3`, when I change people to `0`, then the result disappears immediately and I see *Number of people must be at least 1.*
14. **Fixing the people field brings the result back.** Given the state from criterion 13, when I change people to `4`, then the message disappears and the result immediately shows `Person 1 (paid the bill): $31.72`, `Persons 2–4: $31.72 each` and Amount to collect from others $95.16.
15. **Fixing the subtotal brings the result back.** Given subtotal `12.345` shows its error, with tax `8.875`, tip `18` and people `3`, when I delete the last `5`, then the message disappears and I see:
    - Subtotal $12.34
    - Tax $1.10
    - Tip $2.22
    - Total $15.66
    - `Person 1 (paid the bill): $5.22`
    - `Persons 2–3: $5.22 each`
    - Amount to collect from others $10.44
16. **Typing a decimal value.** Given tax `0`, tip `0` and people `2`, when I type the subtotal `12.50` one character at a time, then no error appears at any point. After `12` and after `12.` the results show Total $12.00 and $6.00 for each person. After `12.5` they show Total $12.50 and $6.25 for each person. Typing `12,50` with a comma behaves the same way.
17. **A lone separator.** Given the subtotal field is empty, when I type only `.` or only `,` into it, then no error is shown while I am still in the field and no result is shown. When I then leave the field, I see *Use only digits and a decimal point or comma, for example 84.50.*
18. **Typing a small subtotal.** Given tax `0`, tip `0` and people `1`, when I type the subtotal `0.05` one character at a time, then no error appears while I type `0`, `0.` and `0.0`, and no result is shown for those. After `0.05` the result shows Total $0.05.
19. **Clearing a field.** Given a result is shown, when I delete everything in the subtotal field, then the result disappears immediately and no error is shown until I leave the field.

## S-5: Enter tax as the amount printed on the receipt

**Serves:** J-1, J-2 · **Status:** Not implemented

As a Group Diner, I want to enter the tax as the dollar amount printed on the receipt instead of a rate, so that the total matches the receipt to the cent even when the restaurant calculated tax item by item.

**Acceptance criteria**

1. **Tax amount used directly.** Given I have chosen to enter tax as an amount, when I enter subtotal `100.00`, tax amount `8.87`, tip `18` and people `3`, then I see Tax $8.87, Tip $18.00, Total $126.87, `Person 1 (paid the bill): $42.29` and `Persons 2–3: $42.29 each`.
2. **Too many decimals in the tax amount.** Given I have chosen to enter tax as an amount, when I enter tax amount `8.875`, then I see *Tax amount can have at most 2 decimal places.* and no result.
3. **Tax amount larger than the subtotal.** Given I have chosen to enter tax as an amount and entered subtotal `10.00`, when I enter tax amount `10.01`, then I see *Tax amount can't be more than the subtotal.* and no result.

## S-6: Copy the breakdown to send to the group

**Serves:** J-1 · **Status:** Not implemented

As a Group Diner who paid the bill, I want to copy the breakdown as text, so that I can paste it into the group chat and ask everyone for the right amount once.

**Acceptance criteria**

1. **Copying a result.** Given a result is shown for subtotal `100.00`, tax `8.875`, tip `18` and people `3`, when I choose Copy breakdown, then the clipboard contains the subtotal, tax, tip, total, every share and the amount to collect exactly as displayed, and I see the confirmation *Breakdown copied.*
2. **Nothing to copy.** Given no result is shown, when I look for the Copy breakdown option, then it is not available.
3. **Copying is blocked.** Given a result is shown and the browser blocks clipboard access, when I choose Copy breakdown, then I see *Couldn't copy. Select the breakdown and copy it manually.* and the results stay on screen unchanged.
