# Library stress benchmarks (`benchmarks/stress.ts`)

Wall-clock stress suite for the FFI-bound hot paths. Run it through the
benchmark CLI (`benchmarks/cli.ts`), which prompts for the suite and its
options:

```sh
make benchmark          # interactive: pick sublord or stress, then workload and iterations
```

The `stress` command prompts for the workload (quick <2s, or full ~5s with
Moon scan, full-window scan, and contention burst) and for per-scenario
iterations (blank for defaults).

(`bun run benchmarks/stress.ts` also works directly; `STRESS_FULL=1` and
`STRESS_ITERS=n` are honored as env fallbacks.)

Unlike `benchmarks/sublord.ts` (a correctness comparison across ayanamsa/house
system combinations), this suite measures library performance: each scenario
runs a real public-path workload N times (one uncounted warmup, then timed
iterations) and reports total/mean/min wall ms plus ops/s.

## Methodology

- Fixed deterministic workload: 2003-08-19T06:25:00Z at 13.0827, 80.2707
  (Lahiri / WholeSign), so runs are comparable across machines and commits.
- `uncached` rows use `SwissephLayer` (raw native calls, stateless).
- `cached` rows share one `SwissephCachedLayer` for the whole scenario,
  which is the production steady state: a long-lived layer whose position
  cache is warm after the first run. The speedup table therefore compares
  no-cache against warm-cache, matching a server process rather than a
  cold one-off script.
- Timing uses `node:perf_hooks` around each run; the first warmup iteration
  is excluded from every statistic.

## Scenarios

| Scenario                                 | What it stresses                                                                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `chart:generate-d1`                      | One D1 chart: 8 native positions + houses + mapping (≈10 FFI calls). Same moment repeated, so the cached row is fully warm.                     |
| `chart:generate-all-divisions`           | All 16 divisions from one Placements set: mapping/signification fan-out.                                                                        |
| `throughput:N-moments`                   | N distinct weekly moments back-to-back: sustained-load number.                                                                                  |
| `transit:saturn-ingress-30y`             | Saturn forward ingress ×3 over 30y (~1.5k coarse samples + bisection refinement).                                                               |
| `transit:jupiter-with-charts`            | Ingress search plus D1+D9 chart enrichment per event.                                                                                           |
| `transit:moon-ingress-count-100` (full)  | ~230-day scan, ~1k samples: high-frequency body.                                                                                                |
| `transit:saturn-full-window-scan` (full) | Unreachable count forces a full 30-year scan; the search fails typed (`TransitSearchExhausted`) and the scan itself is timed via `Effect.exit`. |
| `contention:8-parallel-charts` (full)    | 8 concurrent generations: semaphore contention + cache singleflight under load.                                                                 |

## Sample output (quick mode; numbers vary by machine)

```text
Stress suite (quick): 2003-08-19T06:25:00.000Z at 13.0827, 80.2707
Cached rows share one layer for the whole scenario (warm steady state, first warmup run excluded).

Stress results (wall ms; warmup excluded)
┌───┬──────────────────────────────┬──────────┬───────┬──────────┬─────────┬────────┬────────┐
│   │ Scenario                     │ Backend  │ Iters │ Total ms │ Mean ms │ Min ms │ Ops/s  │
├───┼──────────────────────────────┼──────────┼───────┼──────────┼─────────┼────────┼────────┤
│ 0 │ chart:generate-d1            │ uncached │ 20    │ 251.86   │ 12.59   │ 7.58   │ 79.41  │
│ 1 │ chart:generate-d1            │ cached   │ 20    │ 184.87   │ 9.24    │ 5.9    │ 108.18 │
│ 2 │ chart:generate-all-divisions │ cached   │ 5     │ 474.99   │ 95      │ 92.36  │ 10.53  │
│ 3 │ throughput:25-moments        │ cached   │ 2     │ 326.17   │ 163.09  │ 161.05 │ 6.13   │
│ 4 │ transit:saturn-ingress-30y   │ uncached │ 3     │ 14.22    │ 4.74    │ 3.81   │ 210.96 │
│ 5 │ transit:saturn-ingress-30y   │ cached   │ 3     │ 5.9      │ 1.97    │ 1.8    │ 508.87 │
│ 6 │ transit:jupiter-with-charts  │ cached   │ 3     │ 86.41    │ 28.8    │ 27.99  │ 34.72  │
└───┴──────────────────────────────┴──────────┴───────┴──────────┴─────────┴────────┴────────┘
Cached vs uncached speedup (mean)
┌───┬────────────────────────────┬──────────────────┬────────────────┼─────────┐
│   │ Scenario                   │ Uncached mean ms │ Cached mean ms │ Speedup │
├───┼────────────────────────────┼──────────────────┼────────────────┼─────────┤
│ 0 │ chart:generate-d1          │ 12.59            │ 9.24           │ 1.36x   │
│ 1 │ transit:saturn-ingress-30y │ 4.74             │ 1.97           │ 2.41x   │
└───┴────────────────────────────┴──────────────────┴────────────────┴─────────┘
```

## Reading the results

- Absolute scale on a modern laptop: D1 ≈ 5–13 ms, all 16 divisions ≈ 80–100 ms,
  25-moment throughput ≈ 160 ms, Saturn 30y search ≈ 2–7 ms, full-window scan
  ≈ 25–50 ms. Native FFI calls dominate; pure computation (mapping,
  significations, dasha) is noise.
- Steady-state cache speedup is typically 1.2–2.4x on repeated/overlapping
  windows. A single cold scan shows ~parity (small miss overhead): the cache
  pays off for servers, dashboards, and re-scans, not one-off scripts.
- Compare runs with the same mode and machine. For regression tracking, watch
  `chart:generate-d1` uncached (pure FFI+compute cost) and
  `transit:saturn-full-window-scan` uncached (sampling throughput).
