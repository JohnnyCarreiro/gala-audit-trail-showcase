---
id: SDD-001
title: Audit Trail aggregate (chaincode domain)
status: draft
date: 2026-05-05
---

# SDD-001 — Audit Trail aggregate

> Lightweight SDD for the chaincode domain bounded context. In a production project I'd write at least one SDD per bounded context (chaincode-domain, chaincode-contract, frontend-client, off-chain-verifier). For this 1-week showcase I wrote two — this one and `sdd-off-chain-verifier.md` — and folded the others into ADRs and the playbook to stay light. The shape below is what I'd repeat per context if scope grew.

## 1. Bounded context

**Audit Trail Domain** — pure domain logic for game session lifecycle. Lives in `apps/chaincode/src/domain/`. No SDK dependency. Testable in isolation.

## 2. Aggregates and entities

### `GameSession` (aggregate root)

| Field | Type | Notes |
|-------|------|-------|
| `sessionId` | `string` (UUID v4) | Composite key |
| `gameId` | `string` | Reference to the game definition |
| `players` | `string[]` | Allowed player wallets |
| `status` | `SessionStatus` | `Initiated \| InProgress \| Completed \| Disputed` (const-object-as-enum) |
| `createdAt`, `updatedAt` | `string` (ISO 8601) | |
| `outcomeHash` | `Option<string>` | `None` until `Completed` |
| `metadata` | `Option<Record<string, unknown>>` | Game-specific extras |

### `SessionEvent` (entity inside the aggregate)

| Field | Type | Notes |
|-------|------|-------|
| `eventId` | `string` (UUID v4) | |
| `sessionId` | `string` | FK |
| `sequence` | `number` (u64-equivalent) | Strictly monotonic, starts at 1 |
| `eventType` | `EventType` | `SessionStarted \| Checkpoint \| SessionCompleted \| DisputeRaised` |
| `payload` | `Record<string, unknown>` | Event-specific data |
| `prevHash` | `string` | keccak256 of previous event's canonical bytes (or zero-hash for `sequence=1`) |
| `signedBy` | `string` | Wallet of the signer |
| `signature` | `string` | secp256k1 signature over the event's canonical bytes |
| `timestamp` | `string` (ISO 8601) | |

## 3. Use cases

All return `Result<T, DomainError>`. No I/O, no SDK. Use cases receive prior state as input parameters; persistence happens in the contract layer.

| Use case | Input | Output |
|----------|-------|--------|
| `initiateSession` | `InitiateSessionInput`, `Option<GameSession>` (existing — must be `None`) | `Result<GameSession, DomainError>` |
| `appendCheckpoint` | `AppendCheckpointInput`, `GameSession`, `Option<SessionEvent>` (last event for hash chain) | `Result<SessionEvent, DomainError>` |
| `finalizeSession` | `FinalizeSessionInput`, `GameSession`, `outcomeHash` | `Result<GameSession, DomainError>` |
| `verifyIntegrity` | `GameSession`, `SessionEvent[]` (ordered by `sequence`) | `Result<IntegrityVerdict, DomainError>` |
| `disputeSession` (P2) | `DisputeSessionInput`, `GameSession` | `Result<GameSession, DomainError>` |

## 4. Invariants (each has at least one explicit test)

1. Cannot append checkpoints to a session in `Completed` or `Disputed` status.
2. Event `sequence` is strictly monotonic, no gaps (1, 2, 3, ..., N).
3. Only authorized signers can append events (player wallet for checkpoints, studio signer for finalize).
4. `finalizeSession` requires status `InProgress`.
5. `outcomeHash` is immutable once set.
6. `verifyIntegrity` detects sequence gaps, payload mutation, and signature mismatches.
7. The off-chain verifier (Rust, SDD-002) reaches the same verdict on the same data.

## 5. Errors

`DomainError` — const-object-as-enum + `EnumValues<typeof X>` (per playbook). Variants:

- `SessionAlreadyExists(sessionId)`
- `SessionNotFound(sessionId)`
- `SessionAlreadyCompleted(sessionId)`
- `SessionAlreadyDisputed(sessionId)`
- `InvalidEventSequence(sessionId, expected, actual)`
- `UnauthorizedSigner(sessionId, signer)`
- `InvalidStatusTransition(sessionId, from, to)`
- `OutcomeAlreadySet(sessionId)`
- `InvalidSignature(sessionId, eventId)`

Mapped to `ChainError` (`ConflictError`, `NotFoundError`, `DefaultError`) by the contract layer adapter — see ADR-0005.

## 6. Ports / external dependencies

The domain layer has **no external dependencies**. The contract layer (`apps/chaincode/src/contracts/`) and infra layer (`apps/chaincode/src/infra/`) depend on `@gala-chain/api` and `@gala-chain/chaincode` and wrap them in adapters per ADR-0005.

## 7. Open items

Tracked in [`../open-questions.md`](../open-questions.md). Notable:

- Exact SDK signature recovery API surface (`@gala-chain/api`'s `signatures` module) — confirm during `feat-003`
- DTO base class for class-validator decorators — confirm template alignment
