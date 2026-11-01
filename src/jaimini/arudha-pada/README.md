# Arudha Pada

Calculates the Jaimini Arudha Pada for the houses in a chart.

Use `calculate` for the typed result derived from chart placements.

## Plain projection

An Arudha Pada is found by counting from a house's sign to its lord, then the same
number of signs on from the lord. This module applies that rule and nothing else
(ADR-0004).

Classical practice adds two exceptions: when the result falls in the house's own sign,
or in the seventh sign from it, the Arudha is taken as the tenth sign from that result.
They are deliberately not applied here, so a result in either position is the plain
projection and not a bug. A named method that applies the exceptions would be added
beside this one, never as a silent change to it.
