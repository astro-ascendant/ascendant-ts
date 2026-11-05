---
experiment: exp_776759
command: strobe bench benchmarks/library.bench.ts
target: lib
---

# Benchmark Report

## Setup

| Item | Value |
|---|---|
| Base | `ascendant-ts@4afd7fbf64` (dirty) |
| Head | `ascendant-ts@4afd7fbf64` (dirty) |
| OS | Windows 11 26200 (25H2) |
| CPU | Intel Core Ultra 7 265HX, 20 logical CPUs |
| Power | Balanced plan, on battery |
| Pinning | Unpinned (no V-Cache CCD) |
| Sampling | 6 pairs (12 fresh launches) per case, warmup until steady, 5 runs per block |
| Statistics | Wilcoxon signed-rank, Hodges–Lehmann intervals over pairs; secondaries gated on the primary and Holm-corrected |

## Summary

Primary metric: `cpu.work`. Change is head vs. base.

| Case | Base | Head | Change | Interval | Verdict |
|---|---:|---:|---:|---|---|
| `chart:all-divisions` | 21.9 ms | 25.2 ms | +15% | −36% … +64% | unclear |
| `chart:d1` | 12.1 ms | 15.6 ms | +19% | −49% … +105% | underpowered (~10 pairs) |
| `chart:d1-uncached` | 9.11 ms | 13.7 ms | +33% | −37% … +69% | unclear |
| `contention:8-parallel` | 63.8 ms | 45.0 ms | −17% | −58% … +65% | underpowered (~35 pairs) |
| `throughput:25` | 76.6 ms | 61.4 ms | −18% | −38% … +15% | unclear |
| `throughput:50` | 119 ms | 111 ms | −5.6% | −16% … +26% | underpowered (~12 pairs) |
| `transit:jupiter-with-charts` | 28.7 ms | 26.9 ms | +1.8% | −9.6% … +11% | underpowered (~7 pairs) |
| `transit:moon-100` | 14.8 ms | 14.2 ms | −3.9% | −35% … +110% | underpowered (~151 pairs) |
| `transit:saturn-3` | 2.31 ms | 2.35 ms | +1.4% | −29% … +55% | underpowered (~2011 pairs) |
| `transit:saturn-full-scan` | 7.07 ms | 7.09 ms | −7.4% | −44% … +27% | underpowered (~20 pairs) |

None of the cases shows a significant change. Every interval spans zero, which is expected because base and head are the same tree.

## Run-to-run variance

The coefficient of variation (CV) of `cpu.work` between launches:

| Case | Base CV | Head CV |
|---|---:|---:|
| `chart:all-divisions` | 35% | 24% |
| `chart:d1` | 24% | 30% |
| `chart:d1-uncached` | 34% | 16% |
| `contention:8-parallel` | 34% | 36% |
| `throughput:25` | 16% | 10% |
| `throughput:50` | 13% | 13% |
| `transit:jupiter-with-charts` | 17% | 15% |
| `transit:moon-100` | 27% | 20% |
| `transit:saturn-3` | 16% | 23% |
| `transit:saturn-full-scan` | 17% | 20% |

## Context metrics

These metrics are descriptive only and were not tested.

### `run.duration`

| Case | Base | Head | Change | Interval |
|---|---:|---:|---:|---|
| `chart:all-divisions` | 354 ms | 350 ms | −2.7% | −7.5% … +2.2% |
| `chart:d1` | 54.2 ms | 54.6 ms | +0.1% | −8.8% … +17% |
| `chart:d1-uncached` | 53.3 ms | 53.9 ms | +3.3% | −20% … +24% |
| `contention:8-parallel` | 380 ms | 383 ms | −0.8% | −7.5% … +1.8% |
| `throughput:25` | 1201 ms | 1197 ms | +0.4% | −3.0% … +1.7% |
| `throughput:50` | 2360 ms | 2381 ms | +1.5% | −0.7% … +5.9% |
| `transit:jupiter-with-charts` | 147 ms | 142 ms | −2.0% | −10% … +1.1% |
| `transit:moon-100` | 118 ms | 117 ms | +1.2% | −3.0% … +7.3% |
| `transit:saturn-3` | 8.55 ms | 9.27 ms | +7.4% | −11% … +32% |
| `transit:saturn-full-scan` | 35.7 ms | 36.1 ms | −0.5% | −8.5% … +23% |

### `memory.app.private`

| Case | Base | Head | Change | Interval |
|---|---:|---:|---:|---|
| `chart:all-divisions` | 377 MB | 381 MB | +0.9% | −4.7% … +4.7% |
| `chart:d1` | 365 MB | 370 MB | +1.2% | −5.4% … +6.2% |
| `chart:d1-uncached` | 363 MB | 362 MB | −0.5% | −5.6% … +4.4% |
| `contention:8-parallel` | 389 MB | 393 MB | +0.2% | −4.2% … +8.7% |
| `throughput:25` | 386 MB | 400 MB | +2.8% | −4.1% … +10% |
| `throughput:50` | 403 MB | 419 MB | +3.1% | −1.6% … +9.0% |
| `transit:jupiter-with-charts` | 387 MB | 385 MB | −0.1% | −2.3% … +2.4% |
| `transit:moon-100` | 381 MB | 373 MB | −1.2% | −7.5% … +3.7% |
| `transit:saturn-3` | 353 MB | 353 MB | +0.1% | −1.6% … +1.9% |
| `transit:saturn-full-scan` | 373 MB | 372 MB | 0.0% | −2.6% … +1.6% |

### `cpu.app.total`

| Case | Base | Head | Change | Interval |
|---|---:|---:|---:|---|
| `chart:all-divisions` | 6.28% | 7.08% | +17% | −35% … +63% |
| `chart:d1` | 23.1% | 29.8% | +4.5% | −48% … +100% |
| `chart:d1-uncached` | 17.5% | 24.9% | +34% | −24% … +110% |
| `contention:8-parallel` | 16.4% | 11.8% | −17% | −58% … +55% |
| `throughput:25` | 6.50% | 4.89% | −24% | −37% … +13% |
| `throughput:50` | 5.02% | 4.58% | −7.6% | −19% … +27% |
| `transit:jupiter-with-charts` | 18.1% | 19.0% | +6.1% | −0.7% … +11% |
| `transit:moon-100` | 12.9% | 11.9% | −4.9% | −36% … +92% |
| `transit:saturn-3` | 27.2% | 27.4% | −6.2% | −23% … +68% |
| `transit:saturn-full-scan` | 20.6% | 19.1% | −2.0% | −37% … +33% |

## Run time

| Case | Total | Per block |
|---|---:|---:|
| `chart:all-divisions` | 74.2 s | 5.3 s |
| `chart:d1` | 20.3 s | 1.6 s |
| `chart:d1-uncached` | 20.6 s | 1.6 s |
| `contention:8-parallel` | 59.3 s | 4.8 s |
| `throughput:25` | 2.6 min | 12.8 s |
| `throughput:50` | 6.2 min | 31.1 s |
| `transit:jupiter-with-charts` | 32.4 s | 2.6 s |
| `transit:moon-100` | 30.2 s | 2.4 s |
| `transit:saturn-3` | 13.2 s | 1.0 s |
| `transit:saturn-full-scan` | 18.4 s | 1.4 s |

## Warnings

- **Battery:** The machine was on battery, so clocks may drop mid-run. Plug in.
- **StaleCalibration:** This device has never been calibrated, so the Throttled check has no baseline. Run `strobe up`.
- **PowerPlan:** The Balanced plan was kept because the machine was on battery.
- **ReservedCpus:** The target was not pinned, so other processes could share its CPUs.
- **HighVariance:** Every case varies 10–36% between launches (see [Run-to-run variance](#run-to-run-variance)).

## Reproduce

```sh
bunx strobe bench benchmarks/library.bench.ts --base . --head .
```
