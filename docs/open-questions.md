# Open questions

Things uncertain from the GalaChain SDK or other library docs. Each item gets resolved during the relevant Feature's Research phase, then either deleted from this file (if answered) or promoted to an ADR (if it required a decision).

## Convention

```
## <id> — short title
**Context:** where this came up
**Question:** what's unclear
**Working assumption:** what we'll do until resolved
**Resolved by:** (filled when answered) — link to ADR / SDD / commit / docs
```

---

## OQ-01 — Exact `@gala-chain/api` signature recovery API

**Context:** ADR-0003 / SDD-001 — domain layer needs to validate signers.
**Question:** Does `@gala-chain/api` expose a `signatures.recoverPublicKey(dto, signature)` helper, or do we have to import `secp256k1` and recover ourselves on the TS side?
**Working assumption:** Use whatever the SDK exposes; import `@noble/secp256k1` as fallback if needed.
**Resolved by:** TBD — `feat-003-chaincode-domain-model` Research phase.

## OQ-02 — Canonical DTO byte format compatibility

**Context:** SDD-002 — `crates/dto-canon` must produce bytes byte-identical to what the chaincode signs.
**Question:** Is the canonical format documented exhaustively in `authorization.md`, or do we need to reverse-engineer it from a chaincode test run?
**Working assumption:** Read `authorization.md` first; if gaps remain, capture a real signed DTO from a `chaincode-test` run and use it as the golden vector.
**Resolved by:** TBD — `feat-006-dto-canon-lib` Research phase.

## OQ-03 — `@gala-chain/stream` endpoint shape

**Context:** SDD-002 — `apps/audit-verifier` consumes the stream.
**Question:** What's the exact endpoint and authentication for streaming events from a deployed TNT chaincode? Public or auth-gated?
**Working assumption:** Start with public REST polling against a known explorer endpoint; switch to true streaming only if it ships in time.
**Resolved by:** TBD — `feat-007-audit-verifier-cli` Research phase.

## OQ-04 — `chaincode-testing` framework availability

**Context:** SRS NFR-1 — domain code testable in isolation.
**Question:** Is `chaincode-testing` (from `@gala-chain/chain-test`) fully available for our integration tests, or are some primitives still in flux?
**Working assumption:** Use whatever's in the current SDK release; mock the rest.
**Resolved by:** TBD — `feat-004-chaincode-contract-layer` Research phase.

<!-- Append new questions below. Resolved questions can be deleted after promotion to ADR / SDD. -->
