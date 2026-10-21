# 0001 — Chart relationships are one-directional, nakshatra lives on Placements

A Chart is a twelve-house projection derived from Placements at a given moment. We decided that relationships in the model are one-directional to keep data small: a House lists its planets, but a Planet carries no house back-reference, and the house a planet sits in is derived by scanning the Chart. Nakshatra is degree-based, so source nakshatra and pada live on Placements, not on Sign or on a divisional Planet whose longitude has been mapped into another Division.

The position computation is Moment-generic: D1 and requested divisional charts derive together from the same Placements for a Birth or transit Moment. Birth is a special case of Moment that adds latitude and longitude.

_Considered:_ two-way references between House and Planet (rejected — they bloat the data for no query benefit in this read-mostly model), Sign-owned nakshatra (rejected — a sign spans multiple nakshatras), and copying source nakshatra onto divisional Planets (rejected — it would appear to describe the mapped divisional longitude).
