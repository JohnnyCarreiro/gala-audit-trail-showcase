---
id: SDD-002
title: Off-chain verifier (Rust)
status: draft
date: 2026-05-05
---

# SDD-002 — Off-chain verifier (Rust)

> Companion to SDD-001. Same caveat: in a production project I'd write one SDD per bounded context. This is the second of two for the showcase scope.

## 1. Bounded context

**Off-Chain Verification** — independently re-checks the on-chain audit trail without trusting the chaincode. Lives in `crates/dto-canon` (lib) and `apps/audit-verifier` (bin), with `apps/dto-signer` (bin, bonus) as a thin CLI on top of the lib.

Adversarial relationship to the rest of the system: the verifier assumes the chaincode might be compromised.

## 2. Components

### `crates/dto-canon` (library, pure)

Reproduces GalaChain's signing scheme byte-for-byte. No I/O.

| Module | Responsibility |
|--------|---------------|
| `canonical` | Serialize a DTO to canonical JSON per [`authorization.md`](https://github.com/GalaChain/sdk/blob/main/docs/authorization.md): top-level keys sorted alphabetically, no whitespace, only `BigNumber` values stringified, and `signature` + `trace` fields stripped before signing. Byte-identical to `@gala-chain/api`'s internal signing input. |
| `signer` | secp256k1 ECDSA sign over keccak256(canonical bytes). Backed by `k256` + `sha3`. |
| `verifier` | secp256k1 verify + public key recovery. Returns `Result<RecoveredPublicKey, VerifyError>`. |
| `error` | `DtoCanonError` enum (`thiserror`). |

**Tests:**
- Round-trip canonical: `serialize(deserialize(bytes)) == bytes`
- Sign + verify with known vector (extracted from `authorization.md` or from an SDK-signed DTO)
- Invalid signature rejected
- Public key recovery matches known signer

### `apps/audit-verifier` (binary, CORE)

CLI: `audit-verifier verify --session-id <uuid> --chain-url <url>`.

| Module | Responsibility |
|--------|---------------|
| `stream` | `reqwest` client polling the TNT gateway REST API (`https://gateway-testnet.galachain.com/api`) for events of a given `sessionId`. Wrapper returns `Result<Vec<RawEvent>, StreamError>`. We chose REST polling over `@gala-chain/stream` (RxJS Observables, Node-only) to keep the verifier as a single Rust binary — see ADR-0007. |
| `chain` | Recompute hash chain for the session. Detect sequence gaps, payload mutation, signature mismatches. |
| `proof` | Emit proof JSON. |
| `main` | `clap` CLI; `anyhow::Result` (the only place). |
| `error` | One `thiserror` enum per module of I/O. |

**Proof JSON shape:**

```json
{
  "session_id": "uuid-v4",
  "events_verified": 42,
  "status": "valid"
}
```

or:

```json
{
  "session_id": "uuid-v4",
  "events_verified": 17,
  "status": "tampered",
  "tampered_at": 18,
  "reason": "signature mismatch for signer 0xabc..."
}
```

**Tests — three tampering scenarios:**
1. **Sequence gap**: feed events `[1, 2, 4]` → reports `tampered_at: 3, reason: "missing sequence"`
2. **Payload mutation**: take a real event, alter one byte of the payload, keep the original signature → reports signature mismatch
3. **Signature mismatch**: place another signer's signature in the `signedBy` field → rejected at verify

### `apps/dto-signer` (binary, BONUS)

~50 lines. Reads `{ "dto": ..., "private_key_hex": "..." }` from stdin, emits `{ "canonical_hex", "signature_hex", "signer_pubkey" }` to stdout. Demonstrates `dto-canon` reusability. Drop without prejudice if time runs out.

## 3. External dependencies

- `k256` — secp256k1
- `sha3` — keccak256
- `serde` + `serde_json`
- `reqwest` (audit-verifier only) — HTTP to stream
- `tokio` (audit-verifier only)
- `clap` (binaries only) — CLI args
- `anyhow` (binary `main.rs` only)
- `thiserror` (everywhere else)

## 4. Errors

Per Rust convention in playbook:
- One `thiserror` enum per module: `DtoCanonError`, `StreamError`, `ChainError` (renamed `VerifierChainError` to avoid colliding with GalaChain's `ChainError` if the names ever cross a boundary), `ProofError`.
- Composition via `#[from]`.
- `anyhow::Result` only in `apps/audit-verifier/src/main.rs` and `apps/dto-signer/src/main.rs`.
- No `unwrap()` / `expect()` outside tests.

## 5. CI

`.github/workflows/rust-ci.yml`:

```yaml
- cargo fmt --all -- --check
- cargo clippy --workspace --all-targets -- -D warnings
- cargo test --workspace
```

Runs in parallel with the TS pipelines.

## 6. Open items

- Exact stream API endpoint for the deployed TNT chaincode — confirm during `feat-007`
- Signature byte format in practice — `authorization.md` allows both `r || s || v` (default, recovery byte present) and DER (requires explicit `signerPublicKey`); confirm which `BrowserConnectClient` produces with MetaMask.
- Test vectors: extract from a local `chaincode-test` run if `authorization.md` doesn't ship enough
