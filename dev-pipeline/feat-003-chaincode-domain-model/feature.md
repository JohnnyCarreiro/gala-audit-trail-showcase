---
id: FEAT-003
slug: chaincode-domain-model
status: in-progress
depends-on: [FEAT-001, FEAT-002]
blocks: [FEAT-004]
---

# FEAT-003 — Chaincode domain model

## Goal

Implement `apps/chaincode/src/domain/` — pure domain logic for `GameSession` aggregate per [`SDD-001`](../../docs/sdds/sdd-audit-trail-aggregate.md). No SDK dependency, no I/O, fully testable in isolation.

## Acceptance criteria

- [ ] Entities `GameSession` and `SessionEvent` with shape per SDD-001 §2 (using `Option<T>` for `outcomeHash`, `metadata`)
- [ ] `SessionStatus` and `EventType` defined as const-object-as-enum (per playbook)
- [ ] `DomainError` defined as const-object-as-enum + `EnumValues<typeof X>` (per ADR-0005, playbook)
- [ ] Use cases implemented as pure functions returning `Result<T, DomainError>`:
  - [ ] `initiateSession`
  - [ ] `appendCheckpoint`
  - [ ] `finalizeSession`
  - [ ] `verifyIntegrity`
- [ ] Each invariant from SDD-001 §4 has at least one explicit unit test
- [ ] Domain coverage ≥ 70%
- [ ] `bun test` passes for `apps/chaincode/tests/unit/domain/`

## Scope

**In:** entities, value objects, use case functions, domain errors, unit tests.
**Out:** SDK contract layer (FEAT-004), repository wrappers (FEAT-004), DTOs (FEAT-004).

## Open questions

- Resolve [`OQ-01`](../../docs/open-questions.md) (signature recovery API) — affects the `verifyIntegrity` use case.
- Confirm canonical hashing approach matches what `@gala-chain/api` uses internally (so the chaincode's hash chain matches what `crates/dto-canon` reproduces). Defer to FEAT-006 if needed.

## Branch

`feat/chaincode-domain-model`.
