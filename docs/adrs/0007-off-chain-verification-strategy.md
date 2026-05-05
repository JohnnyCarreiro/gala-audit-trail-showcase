---
id: ADR-0007
title: Off-chain verification strategy (Rust)
status: proposed
date: 2026-05-05
---

# ADR-0007 — Off-chain verification strategy (Rust)

## Status

Proposed.

## Context

The on-chain `verifyIntegrity` chaincode method confirms the audit trail is internally consistent. But it runs *inside* the chaincode — if the chaincode is compromised, its verdict is suspect. A real auditor wants to verify the chain without trusting the very code that wrote it.

Separately, the Gala job description lists *"JavaScript, TypeScript, Rust, and others; Web3-based gaming platforms and Blockchain Protocols"*. The TypeScript chaincode + Next.js frontend cover the platform stack the public Gala SDK exposes (98% TS). A protocol-level component in Rust signals familiarity with the lower-tier engineering work the JD references.

## Decision

Build an **off-chain verifier** in Rust as a CLI binary (`apps/audit-verifier`) backed by a pure library (`crates/dto-canon`).

**Threat model addressed:**

| Threat | How the verifier catches it |
|--------|----------------------------|
| Chaincode compromised, returns false `verifyIntegrity` | Verifier reads from `@gala-chain/stream` (public event feed), not from the chaincode itself |
| Ledger admin tampers with stored events | Recomputed hash chain breaks; signatures don't validate |
| Forged event inserted out of order | Sequence check catches gap; signature check catches unauthorized signer |
| Payload mutation | Recomputed `prevHash` mismatch + signature failure |

**Components:**

- **`crates/dto-canon`** (lib, pure, no I/O):
  - Canonical JSON serialization (alphabetical keys, no whitespace, numbers as strings) — byte-identical to GalaChain's signing scheme
  - secp256k1 sign/verify via `k256`
  - keccak256 via `sha3`
  - One `thiserror` enum (`DtoCanonError`)
- **`apps/audit-verifier`** (bin):
  - `clap` CLI: `audit-verifier verify --session-id <uuid> --chain-url <url>`
  - `reqwest` client to `@gala-chain/stream`
  - Recomputes hash chain, validates signatures via `dto-canon`
  - Emits proof JSON (`{ session_id, events_verified, status: "valid" | "tampered", tampered_at?, reason? }`)
  - `anyhow::Result` only in `main.rs`; `thiserror` enums per module elsewhere
- **`apps/dto-signer`** (bin, **bonus**): thin CLI on top of `dto-canon`. Reads DTO JSON from stdin, emits canonical bytes + signature. Useful for debugging and showing reusability of `dto-canon`. Drop without prejudice if time runs out.

**Why Rust:**

- Native compatibility with GalaChain's crypto primitives (secp256k1 + keccak256 — same as Ethereum) via well-audited `k256` and `sha3` crates.
- Single-binary distribution — auditor runs one binary, no Node runtime.
- Performance: verification is CPU-bound; Rust beats Node on signature validation throughput by an order of magnitude.
- Signals protocol-level engineering instinct (the JD's "Blockchain Protocols" line).
- The author already has Rust in production from a Polkadot/Substrate parachain — connects honestly to prior work.

## Alternatives considered

- **TypeScript verifier sharing code with the chaincode** — simpler, faster to build, but produces no fresh signal beyond what the chaincode already shows; trust footprint is the same code reading the same data.
- **No off-chain verifier** — keeps scope to 5 days; loses the protocol-level signal entirely. Rejected.
- **Go verifier** (Fabric is Go) — possible, but the author's Rust experience is stronger and `k256`/`sha3` are more idiomatic than Go's crypto stdlib for this use case.

## Consequences

- Cargo workspace coexists with the Bun workspace at the repo root.
- CI runs both pipelines (`cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test --workspace` + the existing TS pipeline).
- The verifier becomes a marketing asset for the README ("don't trust the chaincode, verify it").
- **If TS work overruns into day 4, the verifier is cuttable.** Order of cuts: `dto-signer` first, then `audit-verifier`, then `dto-canon`. Never cut TS to make room for Rust.

## Links

- [`docs/sdds/sdd-off-chain-verifier.md`](../sdds/sdd-off-chain-verifier.md)
- [`docs/adrs/0002-event-sequencing.md`](./0002-event-sequencing.md)
- [`docs/adrs/0003-signature-strategy.md`](./0003-signature-strategy.md)
- GalaChain authorization spec: https://github.com/GalaChain/sdk/blob/main/docs/authorization.md
