# Sthira dasha

This module exposes the Jaimini Sthira Dasha calculation and its date query
for sign-based periods.

`calculate` creates the Sthira timeline, including Brahma selection data and
rashi strength details. `at` resolves the active rashi dasha at a requested
date.

## Conventions

- Brahma is chosen from the lords of the sixth, eighth and twelfth signs from the
  stronger of the Lagna and the seventh sign (Lagna on a tie), never Saturn, Rahu or
  Ketu, by dignity, Chara Karaka and Kendradi bala from the Atmakaraka. The bala values
  follow the method named in the provenance.
- The Mahadashas always run forward from Brahma's sign, 7, 8 or 9 years for a movable,
  fixed or dual sign.
- Antardashas split a Mahadasha into twelve equal parts and begin at the Mahadasha sign
  itself, unlike Chara, which begins at the next sign.
