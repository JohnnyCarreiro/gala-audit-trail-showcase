---
id: FEAT-008
slug: dto-signer-bonus
status: planned
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

- [ ] `apps/dto-signer/src/main.rs` — ~50 lines, `clap` CLI reading stdin
- [ ] Input format: `{ "dto": <object>, "private_key_hex": "..." }`
- [ ] Output format: `{ "canonical_hex": "...", "signature_hex": "...", "signer_pubkey": "..." }`
- [ ] One demo invocation in `docs/deployment.md` (bonus section)
- [ ] `cargo clippy -p dto-signer -- -D warnings` clean

## Scope

**In:** the binary itself.
**Out:** anything that requires extending `dto-canon`. If `dto-canon` doesn't expose a needed primitive, add the primitive in FEAT-006 instead, not here.

## Open questions

- Confirm private-key input format — hex without `0x` prefix vs with prefix vs PEM.

## Branch

`feat/dto-signer-bonus`.
