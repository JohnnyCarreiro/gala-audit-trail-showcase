---
id: FEAT-004
slug: chaincode-contract-layer
status: in-progress
depends-on: [FEAT-003]
blocks: [FEAT-005]
---

# FEAT-004 — Chaincode contract layer + infra wrappers

## Goal

Implement the SDK boundary: `AuditTrailContract` (exposes domain via `GalaContract`), repository wrappers around the ledger, error adapter mapping `DomainError`/`InfraError` → `ChainError`. This is the **only place `throw` exists** in the chaincode, per ADR-0005.

## Acceptance criteria

- [ ] `apps/chaincode/src/dto/` — DTOs (`InitiateSessionDto`, `AppendCheckpointDto`, `FinalizeSessionDto`) with class-validator decorators, matching SDK conventions
- [ ] `apps/chaincode/src/infra/session-repository.ts` — wraps `getObjectByKey`, `putChainObject`, etc. Each method returns `Result<Option<T>, InfraError>` or `Result<T, InfraError>`. **`try/catch` lives here only.**
- [ ] `apps/chaincode/src/contracts/error-adapter.ts` — `domainErrorToChainError` and `infraErrorToChainError`, exhaustive `match` per playbook
- [ ] `apps/chaincode/src/contracts/AuditTrailContract.ts` — extends `GalaContract`, composes domain + repository via `Result`, throws `ChainError` only via the adapter
- [ ] `apps/chaincode/tests/integration/audit-trail-contract.spec.ts` — covers happy path + edge cases (sequence violation, unauthorized signer, double-completion)
- [ ] Local `chaincode-test` (or equivalent SDK test harness) runs green

## Scope

**In:** DTOs, contract methods, repository wrappers, error adapters, integration tests.
**Out:** frontend, deployment, the Rust verifier.

## Open questions

- Resolve [`OQ-04`](../../docs/open-questions.md) (chaincode-testing framework status).

## Branch

`feat/chaincode-contract-layer`.
