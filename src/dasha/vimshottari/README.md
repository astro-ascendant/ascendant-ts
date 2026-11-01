# Vimshottari dasha

This module calculates the Vimshottari planetary-period timeline and exposes
queries for the active maha dasha and antar dasha at a date.

Use `calculate` to build the timeline and `at` to query it.

The timeline begins at the start of the Moon's star-lord period, not at the birth
moment, so the first Mahadasha's `start` is earlier than the birth moment by the part
of that period the Moon had already travelled. `at` and the Mahadasha ends are
counted from that earlier start.
