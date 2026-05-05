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

## OQ-03 — TNT gateway REST endpoints for session events

**Context:** SDD-002 — `apps/audit-verifier` polls the TNT gateway REST API (chosen over `@gala-chain/stream` per ADR-0007).
**Question:** What are the exact REST endpoints and query parameters on `https://gateway-testnet.galachain.com/api` for fetching events of a given `sessionId`? Auth-gated or public? Pagination model? The gateway exposes Swagger at `/docs` — check there during Research.
**Working assumption:** Public read endpoints exist for queries equivalent to chaincode read methods (`getSession`, `getSessionEvents`); we hit those by issuing the same query DTOs the frontend uses.
**Resolved by:** TBD — `feat-007-audit-verifier-cli` Research phase.

## OQ-04 — `@gala-chain/test` test harness

**Context:** SRS NFR-1 — domain code testable in isolation.
**Question:** Is `@gala-chain/test` (`TestChaincode`, `fixture()`, `writes` matchers — verified to exist on npm at v3.1.1) sufficient for our integration tests? Domain layer is pure and tests with `bun test` directly; the harness is for the contract layer.
**Working assumption:** `@gala-chain/test`'s `TestChaincode` covers contract-layer integration tests; mock the rest if needed.
**Resolved by:** TBD — `feat-004-chaincode-contract-layer` Research phase.

## OQ-05 — Nested-object canonicalization

**Context:** ADR-0007 / SDD-002 — `crates/dto-canon` must reproduce GalaChain's canonical signing input byte-for-byte.
**Question:** [`authorization.md`](https://github.com/GalaChain/sdk/blob/main/docs/authorization.md) specifies top-level alphabetical key sorting, no whitespace, `BigNumber` stringification, and stripping of `signature`/`trace`. **It does not explicitly specify how nested objects and arrays are handled** — are nested object keys also sorted alphabetically (recursive), or preserved insertion order? Are arrays serialized as-is?
**Working assumption:** Recursive alphabetical sorting (most defensive). Validate by capturing a real SDK-signed DTO with nested fields and round-tripping through `dto-canon`.
**Resolved by:** TBD — `feat-006-dto-canon-lib` Research phase.

## OQ-06 — Signature byte format produced by `BrowserConnectClient`

**Context:** ADR-0003 / SDD-002 — verifier must accept the same signature format the frontend produces.
**Question:** `authorization.md` allows two signature formats: `r || s || v` (default, recovery byte present, hex-encoded) and DER (requires explicit `signerPublicKey` field on the DTO). Which does `BrowserConnectClient` produce with MetaMask by default?
**Working assumption:** `r || s || v` (matches Ethereum convention which MetaMask uses). Confirm by inspecting a real signed DTO from the frontend during integration testing.
**Resolved by:** TBD — `feat-005-frontend-bootstrap` integration phase.

<!-- Append new questions below. Resolved questions can be deleted after promotion to ADR / SDD. -->
