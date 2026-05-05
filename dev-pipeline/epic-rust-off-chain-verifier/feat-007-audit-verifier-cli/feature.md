---
id: FEAT-007
slug: audit-verifier-cli
status: planned
depends-on: [FEAT-006]
blocks: []
parent-epic: EPIC-001
---

# FEAT-007 — `apps/audit-verifier` (CLI)

## Goal

Off-chain verifier binary. Consumes `@gala-chain/stream` for events of a given session, recomputes the hash chain via `dto-canon`, validates signatures, emits proof JSON. Catches at least 3 tampering scenarios.

## Acceptance criteria

- [ ] `apps/audit-verifier/src/main.rs` — `clap` CLI: `audit-verifier verify --session-id <uuid> --chain-url <url>`. **Only place using `anyhow::Result`.**
- [ ] `apps/audit-verifier/src/stream.rs` — `reqwest`-based wrapper around the stream endpoint. Returns `Result<Vec<RawEvent>, StreamError>`. **Only place with `try/catch`-equivalent error mapping.**
- [ ] `apps/audit-verifier/src/chain.rs` — recomputes hash chain, calls `dto-canon::verifier`, returns `Result<Verdict, VerifierChainError>`
- [ ] `apps/audit-verifier/src/proof.rs` — emits proof JSON per SDD-002 §2
- [ ] `apps/audit-verifier/src/error.rs` — `thiserror` enum per module
- [ ] Tests in `apps/audit-verifier/tests/tampering.rs`:
  - [ ] **Sequence gap**: `[1, 2, 4]` → reports `tampered_at: 3, reason: "missing sequence"`
  - [ ] **Payload mutation**: real event with one altered byte → reports signature mismatch
  - [ ] **Signature mismatch**: foreign signer's signature on `signedBy` field → rejected
- [ ] Manually tested against a deployed TNT session — emits valid proof
- [ ] No `unwrap()` / `expect()` outside tests; no `anyhow` outside `main.rs`
- [ ] `cargo clippy -p audit-verifier -- -D warnings` clean

## Scope

**In:** binary, all three tampering tests, end-to-end run against TNT.
**Out:** `dto-signer` (FEAT-008, separate feature).

## Open questions

- Resolve [`OQ-03`](../../../docs/open-questions.md) — exact stream endpoint shape and auth model.
- Decide on real streaming vs poll-based reads — the latter is simpler and likely sufficient for a 1-week demo.

## Branch

`feat/audit-verifier-cli`.
