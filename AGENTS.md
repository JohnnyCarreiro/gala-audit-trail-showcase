# AGENTS.md — Gala Audit Trail Showcase (project root)

Read this before writing any code. Conventions are normative; deviate only by flagging in chat first.

## Repo shape

Bun workspace + Cargo workspace, side by side:

| Path | Role |
|------|------|
| `apps/chaincode` | TS chaincode on GalaChain SDK (`@gala-chain/api`, `@gala-chain/chaincode`) |
| `apps/frontend` | Next.js 16+ App Router demo via `@gala-chain/connect` |
| `apps/audit-verifier` | Rust binary — off-chain verifier (CLI consuming `@gala-chain/stream` and re-checking the hash chain) |
| `apps/dto-signer` | Rust binary — bonus, thin CLI on top of `dto-canon` |
| `crates/dto-canon` | Rust library — canonical DTO serialization + secp256k1/keccak256 sign/verify primitives |
| `packages/result-helpers` | TS package — `Brand<T,B>`, `EnumValues<T>`, ResulTS globals setup |
| `docs/` | Architecture (SRS, SAD, playbook), ADRs, SDDs, AI-workflow notes |
| `dev-pipeline/` | Active features and epics — RPA / Spec-kit cards |

## Priority reading before designing / implementing

1. [`docs/playbook.md`](./docs/playbook.md) — **start here** (canonical conventions, Result/Option, error shape, boundary rules)
2. [`docs/srs.md`](./docs/srs.md) — requirements + scope
3. [`docs/sad.md`](./docs/sad.md) — system architecture + bounded contexts + sequence diagrams
4. [`docs/adrs/`](./docs/adrs/) — locked-in decisions
5. [`docs/sdds/`](./docs/sdds/) — per-context designs as they land
6. The active feature card in `dev-pipeline/` for the work at hand

## Conventions (summary — full text in `docs/playbook.md`)

### Code style
- **TS**: Biome 2.x for lint + format; 2-space indent; double quotes; semicolons always.
- **Rust**: `cargo fmt` (default profile); `cargo clippy -- -D warnings`.
- **Files ≤ 500 lines, ideally 200–300.** Functions 4–20 lines, single responsibility. Max 2 indentation levels (early returns).

### Error handling — `Result<T, E>` and `Option<T>` everywhere
- TS: `@consolidados/results` (globals via `@gala-audit-trail/result-helpers/globals`). Every business-meaningful failure returns `Result<T, E>`; every "may not exist" returns `Option<T>`. **No `try/catch`** outside wrappers around third-party libs that can throw. **No `.unwrap()` / `.unwrapErr()`** in production.
- Rust: `Result<T, E>` is native. **One `thiserror` enum per module**. `anyhow::Result` only in `apps/*/src/main.rs`. **No `unwrap()` / `expect()`** outside tests.
- Error shape (TS): **const-object-as-enum + `EnumValues<typeof X>`**. PascalCase variants, object payloads, `as const` on every factory return. **No TS `enum`s** (runtime overhead, not tree-shakeable).
- Throw is reserved for two places only:
  1. Adapters around third-party libs that catch and convert to `Err(...)` — the throw is the lib's, not ours.
  2. The `AuditTrailContract` adapter that maps `DomainError`/`InfraError` → `ChainError` (because the GalaChain SDK contract requires it).

### Commits & branching
- **Conventional Commits**. Prefixes: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`.
- Scopes: `(monorepo)`, `(docs)`, `(chaincode)`, `(frontend)`, `(verifier)`, `(dto-canon)`, `(signer)`, `(result-helpers)`, `(ci)`, `(meta)`.
- One commit per logical step.
- **Git Flow strict from day 1**: `main` for production (PR only), `dev` for integration (PR only — no direct commits, including bootstrap). Feature branches `feat/<feature-slug>` always. Reviewed + explicitly approved before merge.

### Doc comments
- Domain layer (aggregates, use cases, events, ports): rich doc-comments as provenance — invariants, emitted events, links to ADRs.
- Inline comments inside function bodies: minimal. Only WHY non-obvious. Never restate WHAT.

### Strict typing
- TS: `"strict": true` everywhere; no `any` (justify in comment if absolutely needed).
- Rust: clippy clean; no `unsafe` without an ADR justifying it.

## Things to NOT do

- Don't bypass Conventional Commits.
- Don't `try/catch` in domain code, use cases, route handlers, or contract methods. Wrap third-party calls in adapters that return `Result`.
- Don't use `.unwrap()` / `.unwrapErr()` (TS) or `.unwrap()` / `.expect()` (Rust) outside tests.
- Don't define error hierarchies via `class FooError extends Error` (TS) or sprinkle `anyhow::Error` across the codebase (Rust). Use the const-object-as-enum + `EnumValues<typeof X>` (TS) or one `thiserror` enum per module (Rust).
- Don't use TypeScript `enum`. Use const objects.
- Don't return `T | null` / `T | undefined` from our code. Use `Option<T>`. Conversion happens once, at the third-party boundary.
- Don't commit secrets. Keep `.env` and `.env.example` in sync.
- Don't push directly to `main`.

## Per-context AGENTS.md

Each `apps/*`, `packages/*`, and `crates/*` may grow its own `AGENTS.md` with surface-specific build/test commands and conventions. **Read it when you enter the directory.**
