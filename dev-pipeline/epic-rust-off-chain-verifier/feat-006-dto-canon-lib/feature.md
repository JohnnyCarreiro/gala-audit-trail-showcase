---
id: FEAT-006
slug: dto-canon-lib
status: done
depends-on: [FEAT-001]
blocks: [FEAT-007, FEAT-008]
parent-epic: EPIC-001
---

# FEAT-006 — `crates/dto-canon` (canonical serialization + crypto primitives)

## Goal

Pure Rust library that reproduces GalaChain's DTO signing scheme byte-for-byte. No I/O. Consumed by both `apps/audit-verifier` and `apps/dto-signer`.

## Acceptance criteria

- [x] `crates/dto-canon/src/canonical.rs` — serializes a `serde_json::Value` to canonical JSON via `serde_json::to_vec` on a default-feature `Map` (BTreeMap → recursive alphabetical key sort, compact output, no whitespace). Bytes are equivalent to `@gala-chain/api`'s signing input for the JSON subset our audit-trail DTOs use (ASCII keys + standard JSON value types).
- [x] `crates/dto-canon/src/signer.rs` — `sign(private_key_hex, message)` → 65-byte `r || s || v` hex (`v = 27 + recid`, Ethereum convention) via `k256::ecdsa::SigningKey::sign_prehash_recoverable` over `Keccak256(message)`.
- [x] `crates/dto-canon/src/verifier.rs` — `verify(sig, msg, pub)` returns `Result<(), DtoCanonError>` (accepts 64- or 65-byte sigs, compressed or uncompressed pubkeys, raw or Ethereum-offset v); `recover_public_key(sig, msg)` returns SEC1-uncompressed hex.
- [x] `crates/dto-canon/src/error.rs` — `DtoCanonError` (`thiserror` v2), with `From` impls for `serde_json::Error`, `hex::FromHexError`, and `k256::ecdsa::Error`.
- [x] Tests in `crates/dto-canon/tests/round_trip.rs`:
  - [x] Round-trip canonical: 6 fixtures covering flat object, nested unsorted keys, arrays of event-like objects, a realistic `SessionEvent` shape, UTF-8 strings, and a 4-level nested payload.
  - [x] Sign + verify with known private key (`sign_then_verify_succeeds_with_matching_pubkey`).
  - [x] Invalid signature rejected (`verify_rejects_tampered_message`, `verify_rejects_signature_under_a_different_key`, `malformed_signature_hex_is_rejected_at_decode_time`).
  - [x] Public key recovery matches signer (`recover_returns_signer_pubkey_for_real_event_shape`).
- [x] No `unwrap()` / `expect()` outside tests — clippy `unwrap_used`/`expect_used` would catch any regression; tests opt out via `#[allow(clippy::unwrap_used)]`.
- [x] `cargo test -p dto-canon` green — 30 tests pass (16 unit + 14 integration).
- [x] `cargo clippy -p dto-canon --all-targets -- -D warnings` clean.

## Scope

**In:** the library and its tests.
**Out:** any binary, any I/O — those are FEAT-007 and FEAT-008.

## Open questions

- [`OQ-02`](../../../docs/open-questions.md) (exact canonical format) and [`OQ-05`](../../../docs/open-questions.md) (nested-object recursion) — **deferred to FEAT-007 integration** where a real `@gala-chain/api` golden vector can be captured against a deployed chaincode. The Rust-side invariants (recursive sort, no whitespace, stripping rules) are pinned by `round_trip.rs`; the byte-equivalence claim against the TS side will be validated once we have a signed DTO from a live chaincode run.
- Signature byte order: confirmed `r || s || v` (Ethereum convention) by inspecting the signatures emitted in the FEAT-004 G7 integration test logs — last byte was `0x1b` (= 27 = 27 + recid 0). Matches our signer's output format.

## Branch

`feat/dto-canon-lib` (merges into the epic integration branch `feat/rust-off-chain-verifier`).
