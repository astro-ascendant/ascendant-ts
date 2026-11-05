import { bench, script } from "@hona/strobe";

export default bench({
  targets: {
    lib: script("./harness.ts", { runtime: "bun" }),
  },
  cases: {
    "chart:d1-uncached": { primary: "cpu.work", run: (ctx) => ctx.call("chartD1Uncached") },
    "chart:d1": { primary: "cpu.work", run: (ctx) => ctx.call("chartD1") },
    "chart:all-divisions": { primary: "cpu.work", run: (ctx) => ctx.call("chartAllDivisions") },
    "throughput:25": { primary: "cpu.work", run: (ctx) => ctx.call("throughput25") },
    "throughput:50": { primary: "cpu.work", run: (ctx) => ctx.call("throughput50") },
    "transit:saturn-3": { primary: "cpu.work", run: (ctx) => ctx.call("transitSaturn") },
    "transit:jupiter-with-charts": {
      primary: "cpu.work",
      run: (ctx) => ctx.call("transitJupiterWithCharts"),
    },
    "transit:moon-100": { primary: "cpu.work", run: (ctx) => ctx.call("transitMoon100") },
    "transit:saturn-full-scan": {
      primary: "cpu.work",
      run: (ctx) => ctx.call("transitSaturnFullScan"),
    },
    "contention:8-parallel": { primary: "cpu.work", run: (ctx) => ctx.call("parallel8") },
  },
});
