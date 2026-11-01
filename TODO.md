# TODO

Open items found while writing the website docs against `astro-ascendant@6.0.0`.
Nothing here is committed or released yet.

## Bugs

- [ ] **Stations report an unreliable `is_retrograde`.** `src/transit/find.ts` sets
      `is_retrograde: hit.speed < 0` at the refined station moment, where the speed is
      nearly zero, so the flag is noise. Searching Mercury from 2026-11-01, the
      February 2027 retrograde station reports `false` and the June 2027 one reports
      `true`. Decide what the flag should mean at a station (likely the motion just after
      it), fix it, and add a test.
- [ ] **Release the longitude-hit / cusp-crossing fix.** The fix in `src/transit/search.ts`
      (`fixedTargetHit` ignores the sign flip of `wrapSigned` at 180° from the target) and
      its two regression tests are done, with a patch changeset in
      `.changeset/transit-no-opposite-hits.md`. Before the fix, `longitude-hit` and
      `cusp-crossing` also returned the antipode (Sun at 100° alternated with 280°). Run
      `bun run version` and publish. Then remove the "Known issue in 6.0.0" callout from
      the website's Transit searches guide.
- [ ] **Check high-latitude behavior of cusp-based house systems.** The website docs warn
      that Placidus and Koch become unreliable near the polar circles. That is general
      astrology, not tested here. Find out what the library does at, say, 70° N, and
      document it or fail with a typed error.

## Docs

- [x] **README says 39 ayanamsas; there are 47.** `AstroParams.Ayanamsa.literals.length`
      is 47 in 6.0.0 (13 house systems is correct). Fix the "Methodologies" line in
      `README.md`.
- [ ] **README quick start should use `ManagedRuntime`.** It uses `Effect.runPromise` with
      `Effect.provide`. Switch it to `ManagedRuntime.make(Runtime.MainLayer)`, as the
      website Quickstart does, and say why one long-lived runtime is the recommended way
      (each runtime builds its own layer, so one runtime shares one position cache).
- [x] **README links to a missing `docs/reference.md`.** Write it, or point the link at
      the published documentation.
- [ ] **API reference lists `getDivisionalTarget` under `astro-ascendant/chart`.** In 6.0.0
      it is exported only from `astro-ascendant/chart/divisional-mapping`, and
      `import * as C from "astro-ascendant/chart"` gives `C.getDivisionalTarget ===
      undefined`. Fix the docgen config or the export, then regenerate the website's
      Chart reference with `make sync-api` and remove the import-path callout from the
      website's Divisional charts guide.
- [ ] **Add an `engines` field to `package.json`.** There is none, so the supported Node.js
      version is unstated. The website Quickstart says "a current Node.js LTS" because of
      this.
- [ ] **Describe the ayanamsas.** Nothing in the library says what each of the 47 names is
      or how variants differ (for example `Krishnamurti` versus `KrishnamurtiVP291`, the
      default). The website lists only a few from general knowledge.
- [ ] **Document the `sign` field of a transit event.** For `sign-ingress` it is the sign
      the graha moves into at that instant, in the direction of the search (a backward
      search reports the earlier sign). For other kinds it is the sign at the event.
- [ ] **Document that `cusp-crossing` follows the cusp as it stands at `from`.** The cusp
      comes from the D1 chart at the search's starting moment and the active house system,
      so a different house system changes the crossing times.
- [ ] **Document that the first Vimshottari Mahadasha starts before birth.** The timeline
      begins at the start of the Moon's star-lord period, so the first period's `start` is
      earlier than the birth moment. Say so in `src/dasha/vimshottari/README.md`.
- [ ] **Document the plain Arudha projection.** `ArudhaPada` and `Upapada` use the plain
      projection (ADR-0004) with no adjustment when the result lands on the source sign or
      the seventh from it. In the sample birth both A1 and A7 land on their source signs.
      State this in the module README and the JSDoc so it is not mistaken for a bug, or
      decide whether to add the classical adjustment.
- [ ] **Note that `LocatedMoment.make` throws but `Chart.generate` fails typed.** The
      constructor validates immediately; passing a plain object to `Chart.generate` gives a
      `LocatedMomentValidationError` instead.
- [ ] **Note that `sex` is only copied onto charts.** `ChartParams.sex` is not used in any
      calculation.

## API cleanups to consider

- [ ] **Jaimini error class names collide.** The exported classes are all called
      `EvidenceError` and `CalculationError`, while their tags are module-specific
      (`ArgalaEvidenceError`, `KarakamshaCalculationError`, and so on). Consider
      exporting distinct names so `catchTag` names and imports line up.
- [ ] **Provenance is missing from some results.** Placements, Vimshottari dashas and
      Ashtakavarga (`SAV.calculate`) results carry no `provenance`, while charts, Jaimini
      results, Chara and Sthira dashas and transit events do. Decide whether the rest
      should.
- [ ] **`Transit.findTransits` error type includes a schema `Issue`.** Find out when it
      can occur, and map it into `TransitValidationError` if it can.
- [ ] **Check that the `verification` lists in `src/provenance.ts` are executed by tests.**
      The glossary calls them executable criteria, but they are plain strings.

## Repo housekeeping

- [x] **Dead `repos/**` references after removing `repos/effect`.** Remove them from
      `.githooks/pre-commit` (the `repos/*` case), `.oxfmtrc.json`, `.oxlintrc.json`,
      `.vscode/settings.json`, `.github/codeql/codeql-config.yml` and
      `.github/workflows/codeql.yml`.
- [x] **Commit the pending local changes.** `CONTEXT.md` is renamed to `GLOSSARY.md` with
      the Yoga entries removed, the `repos/effect` subtree is removed (2,977 files), the
      `Makefile` lost `add-effect` and `pull-effect`, `CLAUDE.md` now points at the
      upstream Effect `LLMS.md`, and the transit fix, its tests and the changeset are
      uncommitted.
- [ ] **Check tools that expect `CONTEXT.md`.** `docs/agents/domain.md` and `CLAUDE.md` now
      say `GLOSSARY.md`, but generic domain-modeling skills conventionally read
      `CONTEXT.md`. Confirm the skills you use find the renamed file. Also reread
      `docs/agents/domain.md`: it describes a multi-context layout with per-context
      glossaries, and the replacement was mechanical.
- [x] **Format check fails on a clean tree.** `oxfmt --check .` flags every file because
      Windows `core.autocrlf=true` checks them out with CRLF. Pin line endings with
      `.gitattributes` (`* text=auto eol=lf`).
- [ ] **Run `make` once on a machine that has it.** `make` is not installed on this
      Windows shell, so the edited `Makefile` was only checked by extracting its help
      lines, and the `.DEFAULT` forwarding rule was not run.
