---
id: ADR-0002
title: Event sequencing and integrity verification
status: proposed
date: 2026-05-05
---

# ADR-0002 — Event sequencing and integrity verification

## Status

Proposed.

## Context

The audit trail's value depends on detecting tampering. Three threats to model:

- **Sequence gaps** — an event was deleted or skipped
- **Payload mutation** — an event's content was altered after being signed
- **Reorder / forgery** — events inserted out of order or by an unauthorized party

We need an on-chain verification path (`verifyIntegrity` chaincode method) and an off-chain verification path (Rust `audit-verifier`) that detect all three.

## Decision

Each `SessionEvent` carries:

- `sequence: u64` — strictly monotonic, no gaps. Enforced on append.
- `prevHash: string` — keccak256 of the previous event's canonical bytes (or a zero-hash for `sequence = 1`).
- `signature: string` — secp256k1 signature over the canonical DTO bytes.
- `signedBy: string` — public key (or wallet address) of the signer.

Verification (both on-chain and off-chain):

1. Read events ordered by `sequence`.
2. Confirm sequence is `1, 2, 3, ..., N` with no gaps.
3. For each event, recompute `prevHash` from the previous event's canonical bytes; reject on mismatch.
4. For each event, verify the signature over its canonical bytes; reject on mismatch.
5. Confirm `signedBy` is authorized for the session (player set or studio signer per ADR-0003).

## Alternatives considered

- **Merkle tree per session** — stronger inclusion proofs, but overkill for sub-100-event sessions and adds canonical encoding complexity. Rejected for this scope.
- **No `prevHash`, only signature** — payload mutation would still be caught by signature mismatch, but a missing event in the middle would only be caught by sequence check. Hash chain adds redundancy and makes off-chain verification more obviously correct. Kept.

## Consequences

- Append cost is one read (last event's hash) + one write.
- Canonical serialization rules must be identical between TS chaincode signer and Rust `dto-canon` verifier — see ADR-0007.
- The on-chain `verifyIntegrity` and the off-chain Rust verifier produce equivalent verdicts on the same data.

## Links

- [`docs/adrs/0003-signature-strategy.md`](./0003-signature-strategy.md)
- [`docs/adrs/0007-off-chain-verification-strategy.md`](./0007-off-chain-verification-strategy.md)
- [`docs/sdds/sdd-off-chain-verifier.md`](../sdds/sdd-off-chain-verifier.md)
