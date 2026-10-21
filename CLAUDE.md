# Project Guidelines

## Effect Best Practices

Reference: `@repos/effect/LLMS.md` - Effect API patterns, version-matched.  
Reach when: uncertain on API, checking generics, debugging inference.

### Running Effect programs
- Entry point: `NodeRuntime.runMain` (Node), `BunRuntime.runMain` (Bun), `BrowserRuntime.runMain` (Browser) - enables graceful shutdown on interrupt. Prefer `BunRuntime.runMain`
- Teardown: `Effect.addFinalizer` inside the main effect; `runMain` guarantees execution on CTRL+C.

### Avoid tacit (point-free) usage
- Always wrap callbacks explicitly: `Effect.map((x) => fn(x))`, not `Effect.map(fn)`.
- Combine combinators with explicit lambdas in `pipe` or `Effect.gen` - never `flow` from `effect/Function`.
- Reason: tacit style erases generics on overloads, weakens inference, degrades stack traces.

### Function declarations
- **Pure functions** — use named `function` declaration: `function add(a: number, b: number): number { return a + b }`
- **Functions with side effects** (throwing, I/O, mutation) — use `Effect.fn` with `yield*`:
  ```ts
  const parseUser = Effect.fn("parseUser")(function* (input: string) {
    const parsed = yield* Schema.decode(User)(input)
    return parsed
  })
  ```
- Never use arrow functions for top-level declarations — they obscure stack traces and hinder Effect's error tracking.

### Dual APIs (data-first vs data-last)
- **data-last** (`pipe(effect, Effect.map(fn), ...)`): chaining multiple operations.
- **data-first** (`Effect.map(effect, fn)`): single standalone operation.
- Both equivalent; choose for readability.

### Branded types
- Use `Brand.Brand<"Name">` to prevent interchangeable primitives (e.g., `UserId` vs `ProductId`).
- Constructors:
  - `Brand.nominal<T>()` - zero-cost, type-level only.
  - `Brand.make<T>(validator)` - runtime validation; throws `BrandError` (use `.option`, `.result`, `.is` for non-throwing).
- Combine with `Brand.all(...)`, extract via `Brand.Brand.FromConstructor<typeof Combined>`.
- Never assign raw primitives - always construct through the brand.

### Pattern matching (prefer `Match` over if/else)
- Create matcher: `Match.type<T>()` or `Match.value(v)`.
- Patterns: `Match.when`, `Match.not`, `Match.tag(...tags)` for `_tag`-discriminated unions.
- Primitives: `Match.string`, `number`, `boolean`, `bigint`, `symbol`, `date`, `record`, `null`, `undefined`, `defined`, `any`, `is(...)`, `instanceOf(Class)`.
- Finalize every matcher:
  - `Match.exhaustive` - compile-time error on unhandled cases (preferred).
  - `Match.orElse(fallback)` - default.
  - `Match.option` / `Match.result` - wrap in `Option`/`Result`.
- For consistent return type: `Match.withReturnType<T>()` **first** in pipeline.

### Avoiding excessive nesting
1. **`Effect.gen`** (preferred) - sequential logic with `yield*`:
   ```ts
   const elapsed = <R, E, A>(self: Effect.Effect<A, E, R>) =>
     Effect.gen(function* () {
       const start = yield* now
       const result = yield* self
       const end = yield* now
       return result
     })
   ```
2. **Do simulation** (`Effect.Do`, `Effect.bind`, `Effect.let`) - binds values into scope without nesting.
3. Avoid nested `pipe(a, Effect.andThen(x => b.pipe(...)))`.

### Quick reference - apply every applicable row before considering this guide satisfied
| Situation | Prefer |
|---|---|
| App entry point | `NodeRuntime.runMain` (or platform equivalent) |
| Bare function ref in combinator | Explicit lambda, never tacit/`flow` |
| Single Effect operation | data-first: `Effect.map(effect, fn)` |
| Chaining operations | data-last + `pipe`: `pipe(effect, Effect.map(f1), Effect.map(f2))` |
| Distinct IDs sharing primitive | Branded type via `Brand.nominal` or `Brand.make` |
| Branching on union/`_tag` | `Match` module, finalized with `.exhaustive`/`.orElse` |
| Sequencing dependent effects | `Effect.gen` with `yield*` |

## Vendored Repositories
- Do not edit files under `@repos/` unless explicitly asked.
- Do not import from `@repos/` - use normal package dependencies.

## Git hooks

`bun install` registers the versioned hooks in `.githooks` via `core.hooksPath`; re-register after a fresh clone with `make hooks`.

The `pre-commit` hook rejects any staged file over 5,000 estimated tokens (bytes ÷ 4). Sizes come from the staged blob, so partial staging changes nothing, and only the files in that commit are inspected. Lockfiles, legal boilerplate, vendored trees, build output, generated code, and binaries are skipped.  
Reach when: a commit is blocked by the guard, or a file you are writing may exceed 5,000 tokens.

- Raise the limit for one commit: `MAX_FILE_TOKENS=20000 git commit ...`
- Bypass the guard, sparingly: `git commit --no-verify`
- Change the skip list in `.githooks/pre-commit` (`is_ignored`) rather than disabling the hook.

## Agent skills

### Issue tracker
- `docs/agents/issue-tracker.md` - Linear MCP integration.  
  Reach when: creating/fetching issues, syncing with tracker.

### Triage labels
- `docs/agents/triage-labels.md` - Vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix.  
  Reach when: labeling issues, routing work.

### Domain docs
- `docs/agents/domain.md` - Single-context layout: `CONTEXT.md` + `docs/adr/` at repo root.  
  Reach when: writing ADRs, updating domain model.