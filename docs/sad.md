# SAD — System Architecture Document

**Project:** Gala Audit Trail Showcase
**Status:** Draft (locked-in decisions migrate to ADRs as they're finalized)

> Lightweight version. Real projects get a fuller SAD with deployment views, threat model, capacity planning. Here we cover what reviewers need to understand the system shape.

## 1. Context diagram

```mermaid
flowchart LR
  Player[Player wallet<br/>MetaMask] -- signs DTO --> Frontend
  Studio[Game studio backend<br/>signer] -- signs checkpoint DTO --> Frontend
  Frontend["apps/frontend<br/>Next.js + @gala-chain/connect"] -- submit/read --> GalaChain[(GalaChain TNT<br/>Hyperledger Fabric)]
  Chaincode["apps/chaincode<br/>AuditTrailContract"] -- runs inside --> GalaChain
  Gateway[("TNT gateway REST<br/>gateway-testnet.galachain.com/api")] -- queries --> GalaChain
  Verifier["apps/audit-verifier<br/>Rust CLI"] -- polls --> Gateway
  Reviewer[Reviewer / auditor] -- runs --> Verifier
  Reviewer -. clicks Verify .-> Frontend
```

Three components own the user-facing surface; one component (`audit-verifier`) is independent and adversarial — it deliberately does not trust the chaincode.

## 2. Bounded contexts

| Context | Owner | Responsibility |
|---------|-------|----------------|
| **Audit Trail Domain** | `apps/chaincode/src/domain/` | Pure domain logic — entities (`GameSession`, `SessionEvent`), use cases (`initiateSession`, `appendCheckpoint`, `finalizeSession`, `verifyIntegrity`), invariants, `DomainError`. No SDK dependency. |
| **Audit Trail Contract** | `apps/chaincode/src/contracts/`, `apps/chaincode/src/infra/` | SDK boundary — `AuditTrailContract` (exposes domain via GalaChain SDK), repository wrappers around the ledger, error adapter (`DomainError` / `InfraError` → `ChainError`). |
| **Frontend Client** | `apps/frontend/` | Wallet connection, DTO signing, session UI, off-chain verification trigger. Wraps `@gala-chain/connect` + `BrowserConnectClient` in adapters returning `Result<T, ClientError>`. |
| **Off-Chain Verification** | `apps/audit-verifier/`, `crates/dto-canon/` | Independent verifier — recomputes hash chain from public stream, validates signatures, emits proof. Adversarial — assumes chaincode may be compromised. |

The first two share a process (the chaincode); the next two are separate processes. Communication between contexts goes through clearly typed boundaries: SDK contracts (`@gala-chain/api` DTOs), HTTP via `@gala-chain/connect`, and stream API for the verifier.

## 3. Sequence — happy path

```mermaid
sequenceDiagram
  participant Studio as Studio backend
  participant FE as Frontend
  participant CC as Chaincode (AuditTrailContract)
  participant LDG as Ledger
  participant V as Verifier (Rust)

  Studio->>FE: signed InitiateSessionDto
  FE->>CC: submitTransaction("initiateSession", dto)
  CC->>LDG: putState(GameSession{status: Initiated})
  CC-->>FE: GameSession
  loop checkpoints
    Studio->>FE: signed AppendCheckpointDto (seq=N)
    FE->>CC: submitTransaction("appendCheckpoint", dto)
    CC->>LDG: putState(SessionEvent{seq: N, hash: H_N})
    CC-->>FE: SessionEvent
  end
  Studio->>FE: signed FinalizeSessionDto (outcomeHash)
  FE->>CC: submitTransaction("finalizeSession", dto)
  CC->>LDG: putState(GameSession{status: Completed, outcomeHash})
  CC-->>FE: GameSession

  Note over V,LDG: Off-chain — independent of FE
  V->>LDG: stream events for sessionId
  V->>V: recompute hash chain, verify signatures
  V-->>V: emit proof.json
```

## 4. Component view

```mermaid
flowchart TB
  subgraph TS_Workspace["TypeScript (Bun workspace)"]
    direction TB
    Helpers["packages/result-helpers<br/>Brand, EnumValues, ResulTS globals"]
    Chaincode["apps/chaincode<br/>domain + contract + infra"]
    Frontend["apps/frontend<br/>Next.js App Router<br/>Tailwind v4 + shadcn/ui"]
    Helpers --> Chaincode
    Helpers --> Frontend
  end

  subgraph Rust_Workspace["Rust (Cargo workspace)"]
    direction TB
    DtoCanon["crates/dto-canon<br/>canonical serialize + sign/verify"]
    Verifier["apps/audit-verifier<br/>CLI"]
    Signer["apps/dto-signer (bonus)<br/>thin CLI"]
    DtoCanon --> Verifier
    DtoCanon --> Signer
  end

  Chaincode -. depends on .-> SDK["@gala-chain/api<br/>@gala-chain/chaincode"]
  Frontend -. depends on .-> Connect["@gala-chain/connect"]
  Verifier -. polls .-> Gateway["TNT gateway REST API"]
```

Two workspaces, one repo. Bun and Cargo coexist at the root. CI runs both pipelines in parallel.

## 5. Aggregates and entities (summary)

Detail in [`sdds/sdd-audit-trail-aggregate.md`](./sdds/sdd-audit-trail-aggregate.md).

- **`GameSession`** — aggregate root. Owns lifecycle (`Initiated → InProgress → Completed | Disputed`), the player set, and the outcome hash.
- **`SessionEvent`** — entity inside the `GameSession` aggregate. Strictly sequenced (`sequence: u64`), each carrying its own signed payload and a `prevHash` link forming the hash chain.

## 6. Error model

`DomainError`, `InfraError`, `ClientError` (TS) and per-module `thiserror` enums (Rust) — all const-object-as-enum (TS) / `EnumValues<typeof X>` derived. Single throw site in the chaincode is the `AuditTrailContract` adapter, mapping domain/infra errors to `ChainError`. Detail in [`adrs/0005-result-type-domain-boundary.md`](./adrs/0005-result-type-domain-boundary.md) and [`playbook.md`](./playbook.md).

## 7. Technology choices (traceability to ADRs)

| Decision | ADR |
|----------|-----|
| Domain model: split `Session` / `Event` aggregates | [`0001`](./adrs/0001-domain-model.md) |
| Event sequencing strategy + integrity check | [`0002`](./adrs/0002-event-sequencing.md) |
| Signature scheme + signer authorization | [`0003`](./adrs/0003-signature-strategy.md) |
| Frontend architecture (SSR/CSR, wallet state) | [`0004`](./adrs/0004-frontend-architecture.md) |
| Result/Option discipline + SDK exception boundary | [`0005`](./adrs/0005-result-type-domain-boundary.md) |
| AI-assisted development methodology | [`0006`](./adrs/0006-ai-assisted-development.md) |
| Off-chain verification strategy (Rust) | [`0007`](./adrs/0007-off-chain-verification-strategy.md) |

## 8. Out of architecture

For this 1-week scope, intentionally not modeled:

- Cross-shard or cross-chain bridging
- Multi-tenant deployment
- Production observability (would add OpenTelemetry + a metrics dashboard)
- Permissions beyond wallet-based signer authorization
- Backup / disaster recovery for the off-chain stream consumer
