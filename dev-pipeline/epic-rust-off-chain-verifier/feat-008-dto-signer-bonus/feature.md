---
id: FEAT-008
slug: dto-signer-bonus
status: done
depends-on: [FEAT-006]
blocks: []
parent-epic: EPIC-001
priority: bonus
---

# FEAT-008 — `apps/dto-signer` (BONUS)

## Goal

Thin Rust CLI on top of `crates/dto-canon`. Reads a DTO + private key from stdin, emits canonical bytes + signature + public key. Useful for debugging and as a demo of `dto-canon` reusability.

**This feature is bonus.** Drop it without prejudice if FEAT-007 or any TS work is at risk.

## Acceptance criteria

- [x] `apps/dto-signer/src/main.rs` — 84 lines of stdin-reading CLI (clap not needed — no flags, just stdin in / stdout out, matches the unix-pipe ergonomics in the spec).
- [x] Input format: `{ "dto": <object>, "privateKeyHex": "..." }` (camelCase via serde rename).
- [x] Output format: `{ "canonicalHex": "...", "signatureHex": "...", "signerPubkey": "..." }`.
- [x] Demo invocation added to `docs/deployment.md` § "dto-signer (bonus)" with real input/output.
- [x] `cargo clippy --workspace --all-targets -- -D warnings` clean.

## Scope

**In:** the binary itself.
**Out:** anything that requires extending `dto-canon`. `derive_pubkey` lives in `main.rs` (not `dto-canon`) because the lib is intentionally sign/verify-only — keeping pubkey derivation out keeps `dto-canon`'s surface minimal.

## Open questions

- Resolved: private-key input is **hex** (with or without `0x` prefix); 32 bytes. PEM was rejected as overkill for a debug CLI.

## Branch

`feat/dto-signer-bonus`.
