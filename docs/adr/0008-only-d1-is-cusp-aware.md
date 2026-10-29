---
status: accepted
supersedes: ADR-0002
---

# Only D1 is cusp-aware; divisional charts are whole-sign

D1 houses begin at the selected House system's cusps and D1 alone carries the chart angles, KP star and sub lords, significations, and ruling planets. Every divisional chart counts whole-sign houses from its mapped Lagna's Sign and carries none of that KP data. A Chart is therefore either a Rashi chart or a divisional chart, and its provenance names which projection method produced it. Mapping cusps through a Division almost never preserves their order — the mapping stretches each span by roughly the Division's number — so ADR-0002's mapped-cusp houses were in practice a silent fallback to sign-start houses, and its divisional KP lords were read from mapped longitudes, contradicting Star placement. Degenerate D1 cusps now fail the calculation instead of falling back to equal houses.

_Considered:_ keeping mapped divisional cusps and recording when the fallback fires (rejected — it describes behaviour almost no chart receives), failing when mapped cusps lose their order (rejected — it would reject nearly every divisional chart), and computing divisional KP data from source longitudes (rejected — it would duplicate D1's KP data under another Division's name).
