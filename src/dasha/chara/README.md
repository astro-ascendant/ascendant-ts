# Chara dasha

This module exposes the Jaimini Chara Dasha calculation and its date query
for sign-based periods.

`calculate` creates the Chara timeline from placements. `at` resolves the
active rashi dasha at a requested date.

## Conventions

The method is named after K.N. Rao's treatment of the Chara Dasha:

- Direction comes from the ninth sign from the Lagna: a zodiacal (savya) sign runs the
  signs forward, any other runs them backward. Other authors set direction from the
  Lagna's own sign, which can differ.
- A sign's years are the count from the sign to its lord, in that sign's direction and
  not counting the sign itself; a lord in its own sign gives 12 years. There is no
  extra year for an exalted lord or one fewer for a debilitated lord, which Rao does
  not apply.
- Scorpio and Aquarius have two candidate lords. Both in the sign, 12 years; one in the
  sign, the other rules; otherwise the one with more planets in its sign, then the
  higher exact degree.
- Antardashas split a Mahadasha into twelve equal parts and begin at the sign after the
  Mahadasha sign, in the same direction. Verify this start against your reference text
  before relying on sub-periods: Sthira starts at the sign itself.
