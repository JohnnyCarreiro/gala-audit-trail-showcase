---
id: FEAT-004
slug: chaincode-contract-layer
status: done
depends-on: [FEAT-003]
blocks: [FEAT-005]
---

# FEAT-004 — Chaincode contract layer + infra wrappers

## Goal

Implement the SDK boundary: `AuditTrailContract` (exposes domain via `GalaContract`), repository wrappers around the ledger, error adapter mapping `DomainError`/`InfraError` → `ChainError`. This is the **only place `throw` exists** in the chaincode, per ADR-0005.

## Acceptance criteria

- [x] `apps/chaincode/src/dto/` — DTOs (`InitiateSessionDto`, `AppendCheckpointDto`, `FinalizeSessionDto`) with class-validator decorators, matching SDK conventions
- [x] `apps/chaincode/src/infra/session-repository.ts` — wraps `getObjectByKey`, `putChainObject`, etc. Each method returns `Result<Option<T>, InfraError>` or `Result<T, InfraError>`. **`try/catch` lives here only.**
- [x] `apps/chaincode/src/contracts/error-adapter.ts` — `domainErrorToChainError` and `infraErrorToChainError`, exhaustive `match` per playbook
- [x] `apps/chaincode/src/contracts/AuditTrailContract.ts` — extends `GalaContract`, composes domain + repository via `Result`, throws `ChainError` only via the adapter
- [x] `apps/chaincode/tests/integration/audit-trail-contract.spec.ts` — covers happy path + edge cases (append-after-complete, double-finalize, unauthorized signer, tampered hash chain)
- [x] Local `chaincode-test` (`@gala-chain/test` `fixture()` harness) runs green under `bun:test` — 5 integration tests pass; 35/35 total chaincode tests green

## Scope

**In:** DTOs, contract methods, repository wrappers, error adapters, integration tests.
**Out:** frontend, deployment, the Rust verifier.

## Open questions

- Resolve [`OQ-04`](../../docs/open-questions.md) (chaincode-testing framework status).

## Branch

`feat/chaincode-contract-layer`.
