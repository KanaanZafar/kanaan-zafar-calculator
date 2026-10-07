# App Roles

The app has one role: the **Group Diner**.

## Group Diner

A **Group Diner** is a person at a restaurant table at the end of a shared meal, with the receipt in front of them and a phone in hand, whose group has agreed to split the bill equally. On a given night they are in one of two situations: they paid the whole bill and now need to collect from everyone else, or someone else paid and they need to know what they owe. They are working it out at the table, often in a hurry, and need numbers they can read out to the group and trust without checking them by hand.

**They can:**

- Enter the bill's subtotal, the tax rate and the tip rate that apply to it, and the number of people splitting it, counting the person who paid. Decimals can be typed with a point or a comma, so `12.50` and `12,50` mean the same.
- See the subtotal, tax amount, tip amount and final total, where the subtotal, tax and tip add up exactly to the total.
- See each person's share, with the person who paid shown as Person 1. Everyone except Person 1 pays the same amount. Any cents left over after an equal split are added to Person 1's share. There are always fewer leftover cents than people, so this is never more than 99 cents.
- See the amount the person who paid needs to collect from everyone else.
- See a clear message explaining what to fix when an input is missing or invalid.
- Change any input and get a new result.

**They must never:**

- Be shown a calculation whose displayed shares do not add up exactly to the displayed total.
- Be shown a total that differs from the displayed subtotal plus tax plus tip.
- Be shown a result calculated from missing or invalid input, including an earlier result left on screen after an input is changed to something invalid.
- Have their input silently rounded, truncated or reinterpreted. For example, `12.345` is rejected, not turned into `12.35`, and a subtotal of `1,000` is rejected with a message about thousands separators, not read as `1000` or `1.000`.
- Have a tax or tip rate assumed for them.
- Be asked to create an account or sign in, or have their bill details leave their device.

The two situations, collecting money as the payer and knowing your own share, are covered as separate jobs in [jobs-to-be-done.md](jobs-to-be-done.md).

## Roles considered and rejected

**Payer and Participant as separate roles.** In this version both people enter the same four inputs, see the same results and have the same permissions. Neither can do anything the other must be prevented from doing, so two roles would have identical descriptions. The difference is situational: the same person pays one week and owes the next. It belongs in the Jobs To Be Done, not in separate roles.

Separate roles would make sense if the app gave the payer and the participants different capabilities, such as the payer sharing a read-only breakdown or participants marking themselves as paid. Both need sharing or a backend, which are out of scope.
