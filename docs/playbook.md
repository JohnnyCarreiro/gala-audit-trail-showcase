# Playbook

Canonical conventions for this project. Every contributor (human or AI) reads this before writing code. Deviations require flagging in chat first.

This is a distilled version of the playbook the author uses on larger projects. Full version covers more rules; this version keeps what's load-bearing for the 1-week scope.

## Code structure

| # | Convention |
|---|------------|
| 1 | Files ≤ 500 lines, ideally 200–300 |
| 2 | Functions 4–20 lines, single responsibility |
| 3 | Distinctive, greppable names (<5 project-wide hits for specific types) |
| 4 | Explicit types everywhere — no `any`, no untyped JSON, no stringly-typed APIs |
| 5 | Early returns; max 2 indentation levels |
| 6 | Errors include the offending value and the expected shape |
| 7 | Default formatter: Biome (TS), `cargo fmt` (Rust). No bikeshedding. |
| 8 | Tests runnable headless with one command per package (`bun test`, `cargo test -p <crate>`) |
| 9 | DRY **after** the third occurrence, not before |
| 10 | One repository / port / module → one error enum |

## Error handling — `Result<T, E>` and `Option<T>` everywhere

This project uses `Result<T, E>` and `Option<T>` app-wide, on both the TS and Rust sides. The discipline is the same; the syntax differs.

### TypeScript

**Library:** [`@consolidados/results`](https://github.com/ConsoliDados/results) — Rust-inspired, exhaustive `match`, `None` singleton. The lib exposes globals via `@consolidados/results/globals`; this project re-exports them through `@gala-audit-trail/result-helpers/globals` (an internal package that side-effect imports `@consolidados/results/globals` plus our local `Brand<T,B>` / `EnumValues<T>` helpers). Once configured, `Ok`, `Err`, `Some`, `None`, `match`, and the `Result` / `Option` types are available without per-file imports.

**Convention:** any function with a *business-meaningful* failure returns `Result<T, E>`; any "may not exist" returns `Option<T>`. This **replaces** ad-hoc `throw`s and `T | null` / `T | undefined` returns.

| Pattern | Use for |
|---------|---------|
| `Result<T, E>` | Business failures the caller must handle (`initiateSession`, `verifyIntegrity`, `createConfig`) |
| `Option<T>` | Lookups that may not have a value (`findSession`, optional config, lazy refs) |
| `throw` | Programming errors (broken invariants), and adapters wrapping third-party libs that throw — the wrapper catches and converts to `Err(...)` |

**Error shape — const-object-as-enum:**

```typescript
import type { EnumValues } from "@gala-audit-trail/result-helpers";

export const SessionError = {
  AlreadyDisputed: "AlreadyDisputed",
  AlreadyExists(sessionId: string) {
    return { AlreadyExists: { sessionId } } as const;
  },
  // ... factory function per variant with payload
} as const;
export type SessionError = EnumValues<typeof SessionError>;
```

Rules:
- **PascalCase variants**, HTTP-facing strings `kebab-case` (map at boundary)
- **Object payloads** (not tuples) — destructure by name in `match`
- **`as const` on every factory return** — preserves literal types for exhaustive `match`
- **Derive the union with `EnumValues<typeof X>`** — adding a variant extends the type automatically
- **No TypeScript `enum`** — runtime IIFE overhead, not tree-shakeable
- **No class-based error hierarchies** (`class FooError extends Error`)

**Consume errors with `match`:**

```typescript
match(err, {
  AlreadyDisputed: () => /* ... */,
  AlreadyExists: ({ sessionId }) => /* ... */,
  // exhaustive at compile time
});
```

**Anti-patterns:**

| ❌ Don't | ✅ Do |
|---------|------|
| `result.unwrap()` / `.unwrapErr()` in production | `if (r.isErr()) { ... r.value() ... }` or `match` |
| `try { ... } catch { return 500 }` in handler/use-case | Wrapper returning `Result<T, E>`; consume with `match` |
| `Promise<T \| null>` | `Promise<Option<T>>` (or `Promise<Result<Option<T>, E>>` if I/O) |
| `class FooError extends Error` | `Err(FooError.Variant(payload))` from a const-object-as-enum |
| `enum Status { Active, Inactive }` | `const Status = { Active: "ACTIVE", Inactive: "INACTIVE" } as const` |
| `import { Ok, Err, match } from "@consolidados/results"` everywhere | Globals via tsconfig + side-effect import in entry point |

**Throw is reserved for two places only in this project:**

1. **Adapters around third-party libs that throw** (e.g., `getObjectByKey` from `@gala-chain/api`, `BrowserConnectClient` in the frontend, `fetch`). The throw is the lib's, not ours; `try/catch` lives **inside the wrapper** and converts to `Err(...)`.
2. **The `AuditTrailContract` adapter** that maps `DomainError`/`InfraError` → `ChainError`. The GalaChain SDK contract requires it; this is the single throw site in the chaincode.

### Rust

`Result<T, E>` is native. Discipline is the same:

- **One error enum per module** via `thiserror`. Compose via `#[from]`.
- **`anyhow::Result` only in `apps/*/src/main.rs`** (entry points). Domain and library crates never use `anyhow`.
- **No `unwrap()` / `expect()` in production code.** Tests may use them as fail-fast assertions.
- Errors carry the offending value (`#[error("invalid sequence: expected {expected}, got {actual}")]`).

## Commits & branching

- **Conventional Commits** (mandatory). Prefixes: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`.
- Scopes: `(monorepo)`, `(docs)`, `(chaincode)`, `(frontend)`, `(verifier)`, `(dto-canon)`, `(signer)`, `(result-helpers)`, `(ci)`.
- One commit per logical step. Tasks within a Feature → one commit per Task (or group of tightly coupled small tasks).
- **Git Flow strict from day 1.** `main` for production (PR only). `dev` for integration (PR only — no direct commits). Every feature lands via `feat/<feature-slug>` branch + PR, reviewed and explicitly approved before merge. **No exceptions for bootstrap or "Phase 0".** GitHub branch protection + local pre-push githooks enforce this server- and client-side.

## Comments policy

- **Domain layer** (aggregates, use cases, events, ports): rich doc-comments as provenance — invariants, emitted events, links to ADRs.
- **Inline comments inside function bodies**: minimal. Only WHY non-obvious (hidden constraints, surprising ordering, workarounds for specific bugs). Never restate WHAT — well-named identifiers do that.

## Testing

- Unit tests for domain logic (state transitions, invariants, error paths).
- Integration tests at boundaries (chaincode contract methods, verifier against real ledger output).
- Domain coverage ≥ 70%. Each domain invariant has at least one explicit test.
- Tests headless and one-command per package: `bun test`, `cargo test --workspace`.
