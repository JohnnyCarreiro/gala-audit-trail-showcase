---
id: ADR-0005
title: Result/Option discipline and the SDK exception boundary
status: proposed
date: 2026-05-05
---

# ADR-0005 — Result/Option discipline and the SDK exception boundary

## Status

Proposed (load-bearing — referenced by every other ADR).

## Context

This project uses [`@consolidados/results`](https://github.com/ConsoliDados/results) for `Result<T, E>` and `Option<T>` on the TypeScript side, and Rust's native `Result`/`Option` on the Rust side. The discipline is the same on both languages: business failures are values, not exceptions.

But the GalaChain SDK is not built that way. Chaincode methods exposed via `GalaContract` are expected to **throw `ChainError`** — the SDK gateway converts the throw into an HTTP error response. We can't change the SDK contract.

Same problem on the frontend: `BrowserConnectClient` and `@gala-chain/connect` can throw. We can't change those libraries.

We need a discipline that uses Result/Option everywhere in our code without fighting the SDK.

## Decision

**Use `Result<T, E>` and `Option<T>` app-wide.** Throw is reserved for two places:

1. **Adapters around third-party libs that throw** — repository wrappers for the GalaChain SDK (`apps/chaincode/src/infra/`), wallet/connect wrappers in the frontend (`apps/frontend/lib/*-adapter.ts`). The throw is the lib's; `try/catch` lives **inside the adapter only** and converts to `Err(...)`.

2. **The SDK boundary in the chaincode** — `AuditTrailContract` methods compose domain + repository via `Result`, then map terminal errors to `ChainError` via a single explicit adapter (`domainErrorToChainError` / `infraErrorToChainError`). This is the only place `throw` appears in the chaincode itself.

Detail and code examples in [`docs/playbook.md`](../playbook.md).

**Error shape (TS):** const-object-as-enum + `EnumValues<typeof X>` (PascalCase variants, object payloads, `as const`). No `enum`. No `class FooError extends Error`. No discriminated union with a `type` field.

**Error shape (Rust):** one `thiserror` enum per module. `anyhow::Result` only in `apps/*/src/main.rs`. `#[from]` for composition.

**`Option<T>` is the only "may not exist" shape inside our code.** `T | null` and `T | undefined` (TS) appear only at the third-party boundary, converted to `Option<T>` in the adapter.

## Alternatives considered

- **Throw everywhere (idiomatic JS / SDK style)** — natural fit for the SDK, but loses type-safe error handling, makes domain code untestable without integration setup, and contradicts the way the author writes production code on every other project. Rejected.
- **Result only in the domain layer; throw everywhere else** — reduces friction with the SDK but forces a two-style codebase that's harder for new contributors to read. Rejected.
- **Discriminated union with `type` field instead of const-object-as-enum** — works with `match(err, cases, "type")`, but the const-object-as-enum + `EnumValues<typeof X>` pattern is what the author uses on production projects (see playbook). Aligned for consistency.

## Consequences

- Domain code is testable in isolation without SDK or ledger.
- Adapters are visible chokepoints — any new third-party throw site is caught at code review (one new adapter, not scattered `try/catch`).
- The `domainErrorToChainError` adapter maps every variant of `DomainError` exhaustively; adding a variant breaks the build until the mapping is updated.
- Frontend has the same Result discipline, no special-case for the wallet.

## Links

- [`docs/playbook.md`](../playbook.md) — full convention with anti-patterns table
- [`@consolidados/results`](https://github.com/ConsoliDados/results)
