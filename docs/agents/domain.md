# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root: the domain vocabulary (Placements, Located Moment, Division, Dasha, and so on).
- **`docs/adr/`**: read the ADRs that touch the area you're about to work in.

If either doesn't exist, **proceed silently**. Don't flag its absence; don't suggest creating it upfront. The `/domain-modeling` skill creates them lazily when terms or decisions actually get resolved.

## File structure

This is a single-context repo:

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0004-keep-plain-arudha-projection-distinct.md
│   └── 0007-transit-sample-and-bisect.md
└── src/
```

There is no `CONTEXT-MAP.md` and no per-context glossary under `src/`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0004 (plain Arudha projection), but worth reopening because..._
