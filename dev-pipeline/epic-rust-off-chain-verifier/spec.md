---
id: EPIC-001
slug: rust-off-chain-verifier
status: planned
type: epic
children: [FEAT-006, FEAT-007, FEAT-008]
---

# EPIC-001 — Rust off-chain verifier

## Why this epic exists

The on-chain `verifyIntegrity` confirms the audit trail is internally consistent — but it runs *inside* the chaincode. If the chaincode is compromised, its verdict is suspect. We add an independent off-chain verifier in Rust that re-checks the hash chain from public stream data, validates signatures, and emits a proof.

Strategic narrative: this is the protocol-level component that signals familiarity with the lower-tier engineering implied by the Gala JD's "Blockchain Protocols" line. The TS chaincode + frontend show platform-level capability; this epic shows protocol instinct.

Detail in [`docs/adrs/0007-off-chain-verification-strategy.md`](../../docs/adrs/0007-off-chain-verification-strategy.md) and [`docs/sdds/sdd-off-chain-verifier.md`](../../docs/sdds/sdd-off-chain-verifier.md).

## Outcome / acceptance

- [ ] `crates/dto-canon` ships with round-trip + sign/verify tests (FEAT-006)
- [ ] `apps/audit-verifier` CLI runs against a deployed TNT session and emits valid proof JSON, plus catches at least 3 tampering scenarios (FEAT-007)
- [ ] `apps/dto-signer` builds and runs a demo input (FEAT-008, **bonus** — droppable)
- [ ] Rust CI green (`cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test --workspace`)
- [ ] ADR-0007 finalized
- [ ] SDD-002 updated with deployment-time discoveries

## Children (sequenced)

| ID | Slug | Status | Dependency |
|----|------|--------|------------|
| FEAT-006 | [`feat-006-dto-canon-lib`](./feat-006-dto-canon-lib/) | planned | none (within epic) |
| FEAT-007 | [`feat-007-audit-verifier-cli`](./feat-007-audit-verifier-cli/) | planned | FEAT-006 |
| FEAT-008 | [`feat-008-dto-signer-bonus`](./feat-008-dto-signer-bonus/) | planned | FEAT-006 |

FEAT-006 must land first (lib feeds both binaries). FEAT-007 is the load-bearing component for the epic's narrative. FEAT-008 is bonus and droppable without prejudice.

## Cut order if time runs out

1. Drop FEAT-008 (`dto-signer`) — pure bonus, no narrative impact
2. Drop FEAT-007 advanced tampering tests (keep at least 1 of 3 scenarios) — degraded but still demonstrative
3. Drop FEAT-007 entirely — leaves `dto-canon` as a library demo only
4. Drop the entire epic — only if TS work is at risk

The author **never** sacrifices TS quality to make room for Rust. If FEAT-004 is shaky on Day 4, the epic gets cut wholesale.

## Branch strategy

Per playbook §branching: `feat/rust-off-chain-verifier` as the epic integration branch. Children (FEAT-006/007/008) merge into the epic branch; epic merges to `dev` once acceptance is met.
