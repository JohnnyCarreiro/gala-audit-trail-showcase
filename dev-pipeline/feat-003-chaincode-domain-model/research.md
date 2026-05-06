# FEAT-003 — Research

## Context

`apps/chaincode/src/domain/` — pure domain layer for the GameSession aggregate per [SDD-001](../../docs/sdds/sdd-audit-trail-aggregate.md). Per the feature card, **Out of scope: SDK contract layer + DTOs (FEAT-004)**. So this feature implements interfaces, const-object-as-enums, and pure use case functions returning `Result<T, DomainError>`. No SDK dependencies in this layer at all — that's FEAT-004 territory.

## Findings from SDK exploration (Explore agent dispatched 2026-05-05)

### Workspace integration
- `bunx @gala-chain/cli init` scaffolds with **npm + Jest + ESLint + Prettier** baseline. Conflicts with our Bun + bun:test + Biome.
- The template includes `e2e/`, `.devcontainer/`, `Dockerfile` — not needed for showcase scope.
- **Decision: manual scaffold of `apps/chaincode/`** instead of `galachain init`. Cleaner than removing template baggage; we know what we need.

### Pure domain layer composition (FEAT-003 scope)
- No `ChainObject`, no `@ChainKey`, no `@StringEnumProperty` — those decorators live on **persistence types** in FEAT-004's repository / contract layer.
- FEAT-003 entities are **plain TypeScript interfaces** (`type` aliases, not classes). Use cases consume + produce them without I/O.
- `Option<T>` for nullable domain fields (`outcomeHash`, `metadata`) — globals via `@gala-audit-trail/result-helpers/globals-types`.

### Canonical hashing (for `prevHash` chain in `SessionEvent`)
- SDK exports `serialize()` from `@gala-chain/api/utils` using `json-stringify-deterministic` + `js-sha3` (keccak256). Both are bundled deps of `@gala-chain/api`.
- For our pure domain layer (no SDK dep), import the underlying libs directly:
  - `json-stringify-deterministic` (~5 KB, zero-deps utility)
  - `js-sha3` (keccak_256 export)
- The Rust verifier (FEAT-006/007) reproduces the same scheme via `serde_json` with sorted keys + `sha3` crate. Byte-for-byte compat with `json-stringify-deterministic` is the contract.

### Testing framework
- SDK template uses Jest. We use **`bun:test`** for consistency with FEAT-002.
- For FEAT-003 (pure domain, no `TestChaincode`), `bun:test` is the obvious fit — same pattern as `packages/result-helpers/tests/smoke.test.ts`.
- When FEAT-004 needs `@gala-chain/test`'s `TestChaincode` / `fixture()`, those are framework-agnostic class APIs; they work in `bun:test` (Jest-API-compatible).

### Errors that will land in FEAT-004 (not now)
- The Explore agent and the earlier audit gave conflicting info on whether `ConflictError`/`NotFoundError`/`DefaultError` are exported from `@gala-chain/api`. No impact on FEAT-003 — verify and resolve when implementing the ChainError adapter in FEAT-004.

## Decisions resolved before Plan freeze

### Q-A — Pure domain vs SDK-decorated entities

**Decision:** Pure domain. FEAT-003 ships only TS interfaces, not `ChainObject` subclasses. The original prompt's mention of SDK decorators was a leak from FEAT-004 scope; the feature card is clear (Out: DTOs and contract layer).

### Q-B — Manual scaffold vs `galachain init`

**Decision:** Manual scaffold. Less noise to clean up; matches our Bun + Biome conventions from day 1.

### Q-C — Canonical hash dependencies

**Decision:** `json-stringify-deterministic@^1.0.12` + `js-sha3@^0.9.3` as workspace deps of `apps/chaincode`. Same libs `@gala-chain/api` uses — keeps our hash chain compatible with what FEAT-004's persistence layer can verify, and what FEAT-006's Rust `dto-canon` will reproduce.

### Q-D — Test runner

**Decision:** `bun:test`, mirroring `packages/result-helpers`. No Jest.

### Q-E — Hash format

**Decision:** Hex-prefixed `0x` + 64 hex chars (matches Ethereum / GalaChain's `keccak256` output convention). For `sequence = 1`, use the genesis hash `0x` + `"00".repeat(32)` (zero hash).

### Q-F — Where do `Option<T>` boundary conversions happen?

**Decision:** Stay in `Option<T>` throughout the domain layer. The `T | null` ↔ `Option<T>` conversion is FEAT-004's job (in the repository wrapper that talks to the SDK / ledger). FEAT-003 takes `Option<T>` as input and produces `Option<T>` in output entities.

## Open question to flag (non-blocker for FEAT-003)

- **`json-stringify-deterministic` exact byte format vs SDK's `serialize()`**: technically the SDK wraps the same lib so byte-for-byte identical. Promote to `docs/open-questions.md` only if FEAT-006 finds a divergence during Rust impl.

## No remaining blockers

Plan ready to freeze.
