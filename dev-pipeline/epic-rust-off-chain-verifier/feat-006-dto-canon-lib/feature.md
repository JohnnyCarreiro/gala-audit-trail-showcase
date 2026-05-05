---
id: FEAT-006
slug: dto-canon-lib
status: planned
depends-on: [FEAT-001]
blocks: [FEAT-007, FEAT-008]
parent-epic: EPIC-001
---

# FEAT-006 — `crates/dto-canon` (canonical serialization + crypto primitives)

## Goal

Pure Rust library that reproduces GalaChain's DTO signing scheme byte-for-byte. No I/O. Consumed by both `apps/audit-verifier` and `apps/dto-signer`.

## Acceptance criteria

- [ ] `crates/dto-canon/src/canonical.rs` — serializes a `serde_json::Value` to canonical JSON (alphabetical keys, no whitespace, numbers as fixed-string). Bytes match `@gala-chain/api`'s signing input.
- [ ] `crates/dto-canon/src/signer.rs` — secp256k1 ECDSA sign over keccak256(canonical bytes), via `k256` + `sha3`
- [ ] `crates/dto-canon/src/verifier.rs` — secp256k1 verify + public key recovery
- [ ] `crates/dto-canon/src/error.rs` — `DtoCanonError` enum (`thiserror`)
- [ ] Tests in `crates/dto-canon/tests/round_trip.rs`:
  - [ ] Round-trip canonical: `serialize(deserialize(bytes)) == bytes` with at least 5 fixtures
  - [ ] Sign + verify with known vector
  - [ ] Invalid signature rejected
  - [ ] Public key recovery matches signer
- [ ] No `unwrap()` / `expect()` outside tests
- [ ] `cargo test -p dto-canon` green
- [ ] `cargo clippy -p dto-canon -- -D warnings` clean

## Scope

**In:** the library and its tests.
**Out:** any binary, any I/O — those are FEAT-007 and FEAT-008.

## Open questions

- Resolve [`OQ-02`](../../../docs/open-questions.md) — exact canonical format. Confirm against `authorization.md`; capture a real signed DTO from a `chaincode-test` run if needed.
- Confirm signature byte order (r || s || v vs DER) used by `@gala-chain/api`.

## Branch

`feat/dto-canon-lib` (merges into the epic integration branch `feat/rust-off-chain-verifier`).
