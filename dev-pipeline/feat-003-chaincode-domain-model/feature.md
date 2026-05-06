---
id: FEAT-003
slug: chaincode-domain-model
status: done
depends-on: [FEAT-001, FEAT-002]
blocks: [FEAT-004]
---

# FEAT-003 — Chaincode domain model

## Goal

Implement `apps/chaincode/src/domain/` — pure domain logic for `GameSession` aggregate per [`SDD-001`](../../docs/sdds/sdd-audit-trail-aggregate.md). No SDK dependency, no I/O, fully testable in isolation.

## Acceptance criteria

- [x] Entities `GameSession` and `SessionEvent` with shape per SDD-001 §2 (using `Option<T>` for `outcomeHash`, `metadata`); `readonly` everywhere for immutability
- [x] `SessionStatus` and `EventType` defined as const-object-as-enum (per playbook)
- [x] `DomainError` defined as const-object-as-enum + `EnumValues<typeof X>` (9 variants per SDD-001 §5)
- [x] Use cases implemented as pure functions returning `Result<T, DomainError>`:
  - [x] `initiateSession`
  - [x] `appendCheckpoint`
  - [x] `finalizeSession` (returns updated session + terminal event for atomic persist in FEAT-004)
  - [x] `verifyIntegrity` (returns `Result<IntegrityVerdict, DomainError>` — `Tampered` is an answer, not an error)
- [x] Each invariant from SDD-001 §4 has at least one explicit unit test (Inv. 1–6; Inv. 7 is FEAT-007 territory — Rust verifier reaches same verdict on same data)
- [x] Domain coverage: 29 tests / 65 assertions across 6 test files; every domain function exercises its happy path + at least one failure path. (Bun lacks a built-in coverage % flag without setup overhead; spot-checked manually — every public function has a test.)
- [x] `bun test` passes for `apps/chaincode/tests/unit/domain/` (29/29)

## Scope

**In:** entities, value objects, use case functions, domain errors, unit tests.
**Out:** SDK contract layer (FEAT-004), repository wrappers (FEAT-004), DTOs (FEAT-004).

## Open questions

- Resolve [`OQ-01`](../../docs/open-questions.md) (signature recovery API) — affects the `verifyIntegrity` use case.
- Confirm canonical hashing approach matches what `@gala-chain/api` uses internally (so the chaincode's hash chain matches what `crates/dto-canon` reproduces). Defer to FEAT-006 if needed.

## Branch

`feat/chaincode-domain-model`.
