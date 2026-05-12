---
id: FEAT-007
slug: audit-verifier-cli
status: done
depends-on: [FEAT-006]
blocks: []
parent-epic: EPIC-001
---

# FEAT-007 — `apps/audit-verifier` (CLI)

## Goal

Off-chain verifier binary. Consumes `@gala-chain/stream` for events of a given session, recomputes the hash chain via `dto-canon`, validates signatures, emits proof JSON. Catches at least 3 tampering scenarios.

## Acceptance criteria

- [x] `apps/audit-verifier/src/main.rs` — `clap` CLI: `audit-verifier verify --session-id <uuid> --source <PATH>` (file-based source; see scope note below for why `--chain-url` was deferred). **Only place using `anyhow::Result`.**
- [x] `apps/audit-verifier/src/source.rs` — `EventSource` trait + `FileEventSource` impl. Returns `Result<Vec<RawEvent>, StreamError>` and analogous for session + signer registry. Single I/O surface. (Renamed from the spec's `stream.rs` to reflect that the trait is the abstraction; HTTP impl would be a sibling type in the same module.)
- [x] `apps/audit-verifier/src/chain.rs` — recomputes hash chain, calls `dto_canon::recover_public_key` for signature check, returns `Result<Verdict, ChainError>`. **Pure** — no I/O.
- [x] `apps/audit-verifier/src/proof.rs` — emits proof JSON (camelCase top-level fields, verdict tagged via `kind`, tampered reason tagged via `type`). Tool/version/canonical-scheme provenance baked in.
- [x] `apps/audit-verifier/src/error.rs` — two `thiserror` enums (`StreamError`, `ChainError`), each scoped to its module's surface.
- [x] Tests in `apps/audit-verifier/tests/tampering.rs` (6 passing):
  - [x] **Sequence gap** — `[1, 2, 4]` → `Tampered { tampered_at: 3, reason: MissingSequence { expected: 3, actual: 4 } }`.
  - [x] **Payload mutation** — alter `payload` after signing → `SignatureMismatch` (recovered pubkey differs).
  - [x] **Signature mismatch (foreign signer)** — sign event #2 with attacker's key while `signedBy` claims Alice → `SignatureMismatch`.
  - [x] Plus: clean-chain happy path (`Valid(3)`), unauthorized signer (`UnauthorizedSigner` trips before sig check), empty event list (`Valid(0)`).
- [x] Smoke-tested manually: `cargo run -p audit-verifier -- verify --session-id ... --source ...` produces well-formed proof JSON.
- [x] No `unwrap()` / `expect()` outside tests; no `anyhow` outside `main.rs`.
- [x] `cargo clippy --workspace --all-targets -- -D warnings` clean.

## Scope

**In:** binary + file-based event source + chain verifier + proof JSON + 3 tampering scenarios (plus 3 additional safety nets).
**Out:** `dto-signer` (FEAT-008, separate feature). **Deferred:** HTTP source against TNT gateway (OQ-03) — the `EventSource` trait is the seam where it will plug in without touching the verifier core.

## Open questions

- [`OQ-03`](../../../docs/open-questions.md) (TNT gateway REST endpoints) — **deferred**. The CLI architecture is HTTP-ready: `EventSource` is a trait, swapping `FileEventSource` for an `HttpEventSource` is a localized change in `source.rs`. Until a real chaincode is deployed, the file source covers the demo path (and is the actually-useful mode for offline audit verification of an exported session).
- Streaming vs poll: poll-based is the working assumption when OQ-03 is resolved — simpler for a one-shot CLI invocation; streaming brings no benefit since we re-verify in one batch anyway.

> **Note on signing-input convention**: this verifier checks each event's `signature` against `canonicalize_for_signing(event)` — the canonical JSON of the event minus its `signature`/`trace` fields. The current FEAT-004 chaincode persists events with a `signature` inherited from the original DTO (not over the event itself), so a real on-chain event won't have a verifier-checkable signature in this scheme. Wiring the chaincode to sign each event at write time is a follow-up; for now, the verifier tests generate fixtures using this convention so the cryptographic path is exercised end-to-end.

## Branch

`feat/audit-verifier-cli`.
