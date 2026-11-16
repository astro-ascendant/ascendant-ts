# Vimshottari dasha

This module calculates the Vimshottari planetary-period timeline and exposes
queries for the periods active at a date, down to four levels: Mahadasha,
Antardasha (Bhukti), Pratyantardasha (Antara in KP usage) and Sookshma.

Use `calculate` to build the timeline and `at` to query it. The timeline holds
Mahadashas and Antardashas; `pratyantardashas` splits one Antardasha and
`sookshmas` splits one Pratyantardasha, so the 6,561 Sookshmas of a full cycle
are only built when asked for. `at` returns all four levels and subdivides only
the branch active at the instant.

Pratyantardashas and Sookshmas split their parent's actual span in proportion to
each lord's share of the 120-year cycle, with boundaries a whole number of
minutes after the parent's start. They are not stepped through the calendar like
Mahadashas and Antardashas, because calendar stepping runs backwards below a
month near a month's end (see ADR-0009).

The timeline begins at the start of the Moon's star-lord period, not at the birth
moment, so the first Mahadasha's `start` is earlier than the birth moment by the part
of that period the Moon had already travelled. `at` and the Mahadasha ends are
counted from that earlier start.
