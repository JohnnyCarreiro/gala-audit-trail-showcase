# SRS — Software Requirements Specification

**Project:** Gala Audit Trail Showcase
**Status:** Draft (will be finalized as features land)

> Lightweight version. In a production project I'd elaborate on each section; here the goal is to make scope explicit, not to produce a contract.

## 1. Purpose

Provide a verifiable, on-chain audit trail of game session lifecycle events (initiation, intermediate checkpoints, final outcome) on **GalaChain**. Pair the chaincode with a Next.js frontend showing the end-to-end flow, and an off-chain Rust verifier that re-checks the hash chain independently of the chaincode itself.

## 2. Stakeholders

| Stakeholder | Interest |
|-------------|----------|
| Game studios | Tournament integrity, anti-cheat verification, replay attestation, verifiable leaderboards |
| Players | Provable fairness — outcomes can be audited even if the studio is compromised |
| Reviewers (Gala engineering team) | Senior-level engineering signal — architecture, decision-making, code quality |

## 3. Functional requirements

| ID | Requirement |
|----|-------------|
| FR-1 | A game studio can **initiate** a session, declaring participants and game ID. |
| FR-2 | An authorized signer can **append checkpoints** (intermediate state events) to an active session. |
| FR-3 | An authorized signer can **finalize** a session with an immutable outcome hash. |
| FR-4 | Anyone can **read** a session and its events. |
| FR-5 | Anyone can request **on-chain integrity verification** of a session — the chaincode returns a verification result confirming sequence continuity. |
| FR-6 | Anyone can run the **off-chain verifier (Rust CLI)** to independently recompute the hash chain and validate signatures, emitting a proof JSON. |
| FR-7 | (P2, optional) An authorized party can **dispute** a session, freezing further checkpoints. |

## 4. Non-functional requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Domain logic is testable in isolation — no SDK or ledger dependency for unit tests. |
| NFR-2 | Domain coverage ≥ 70%. Each invariant has at least one explicit test. |
| NFR-3 | Off-chain verifier must detect at least 3 tampering scenarios: sequence gap, payload mutation, signature mismatch. |
| NFR-4 | Frontend connects to chaincode via `@gala-chain/connect` + MetaMask (no custom wallet). |
| NFR-5 | Public deployment: chaincode on GalaChain TNT, frontend on Vercel, both reachable from a public URL. |
| NFR-6 | All errors are typed (`Result<T, E>` / `Option<T>`); no untyped throws in production code (see [`playbook.md`](./playbook.md)). |
| NFR-7 | CI passes lint + typecheck + tests on every push (TS via Biome + tsc + bun test; Rust via fmt + clippy + cargo test). |

## 5. Domain invariants

These invariants are non-negotiable and each is covered by an explicit test. Detail in [`sdds/sdd-audit-trail-aggregate.md`](./sdds/sdd-audit-trail-aggregate.md).

1. Cannot append checkpoints to a session in `Completed` or `Disputed` status.
2. Event `sequence` is strictly monotonically increasing — no gaps.
3. Only authorized signers can append events (validated against `players[]` or a configured signer).
4. `finalizeSession` requires status `InProgress`.
5. `outcomeHash` is immutable once set.
6. `verifyIntegrity` (on-chain) detects any tampering of sequence or content.
7. The off-chain verifier (Rust) detects the same tampering, independently of the chaincode.

## 6. Scope

**In scope (must ship):**
- TS chaincode with `initiateSession`, `appendCheckpoint`, `finalizeSession`, `getSession`, `getSessionEvents`, `verifyIntegrity`
- Next.js frontend covering connect → initiate → checkpoint × 2-3 → finalize → verify
- Rust off-chain verifier (`apps/audit-verifier`) polling the TNT gateway REST API for events (chosen over `@gala-chain/stream`'s RxJS Observables to keep a single Rust binary — see ADR-0007)
- Public deployment of all three
- Documentation (this file + SAD + 7 ADRs + 2 SDDs + playbook + AI workflow)

**In scope (should ship if time permits):**
- `disputeSession` flow (FR-7)
- Rust `apps/dto-signer` thin CLI (bonus — see [`adrs/0007-off-chain-verification-strategy.md`](./adrs/0007-off-chain-verification-strategy.md))

**Out of scope:**
- Multi-game tournaments, leaderboard aggregation, player reputation
- Authentication / user accounts beyond wallet ownership
- Mobile apps
- Real-time streaming UI (polling is sufficient for the demo)
- Production hardening (rate limiting, observability stack, alerting)

## 7. Glossary

| Term | Meaning |
|------|---------|
| **Session** | A single play instance of a game, bounded by `initiate` and `finalize` |
| **Event** | A signed, sequenced record of something that happened during a session |
| **Checkpoint** | An event of type `CHECKPOINT` representing intermediate state |
| **Outcome hash** | A hash of the final game result (computed off-chain, stored on-chain at finalize) |
| **TNT** | GalaChain Test Network — the public test environment |
| **Off-chain verifier** | A Rust CLI that re-computes the hash chain from public stream data, independently of the chaincode |
