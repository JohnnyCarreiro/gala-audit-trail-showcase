---
id: ADR-0003
title: Signature strategy and signer authorization
status: proposed
date: 2026-05-05
---

# ADR-0003 — Signature strategy and signer authorization

## Status

Proposed.

## Context

We need to define:

- **Who** can sign each event type (initiate, checkpoint, finalize, dispute)
- **What** crypto primitives are used
- **How** authorization is checked at append time

Threat model includes a malicious player, a compromised studio backend, and a colluding chaincode operator. The audit trail's job is to make all three detectable post hoc, not necessarily preventable in real time.

## Decision

**Crypto primitives:** secp256k1 + keccak256, matching GalaChain's native scheme (also identical to Ethereum). Both the TS chaincode and the Rust `dto-canon` lib use the same primitives — `@gala-chain/api` on the TS side, `k256` + `sha3` on the Rust side.

**Signer roles:**

| Action | Authorized signers |
|--------|-------------------|
| `initiateSession` | Studio signer (configured per game) |
| `appendCheckpoint` | Studio signer **or** any wallet in `players[]` |
| `finalizeSession` | Studio signer only |
| `disputeSession` (P2) | Studio signer **or** any wallet in `players[]` |

**Authorization check** happens in the domain layer (`UnauthorizedSigner` is a `DomainError` variant). The contract layer extracts the public key from the signature and passes it to the domain function as input; domain validates against the session's allowed signers.

## Alternatives considered

- **Multi-sig for finalize** (M-of-N players) — closer to a true tournament integrity model, but adds DTO complexity and a coordination layer. Out of scope for the 1-week showcase; flagged as a natural extension.
- **Threshold signatures** — same reasoning, deferred.
- **No signer roles, single trusted oracle** — too weak for the audit trail story.

## Consequences

- Wallet integration in the frontend must support signing arbitrary DTOs (canonical form). `@gala-chain/connect`'s `BrowserConnectClient` handles this.
- Off-chain verifier (Rust) must reproduce the canonical serialization byte-for-byte to verify signatures. See ADR-0007 and `crates/dto-canon`.

## Links

- [`docs/adrs/0002-event-sequencing.md`](./0002-event-sequencing.md)
- [`docs/adrs/0007-off-chain-verification-strategy.md`](./0007-off-chain-verification-strategy.md)
- GalaChain authorization spec: https://github.com/GalaChain/sdk/blob/main/docs/authorization.md
