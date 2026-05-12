# FEAT-004 — Research

## Context

Wires the SDK contract layer over the FEAT-003 pure domain. Adds DTOs + class-validator validation, ChainObject persistence types, repository wrappers (the only `try/catch` site in the chaincode), `AuditTrailContract` extending `GalaContract`, and the `domainErrorToChainError` / `infraErrorToChainError` adapters that map terminal failures to `ChainError` at the SDK boundary (the single `throw` site).

## SDK API surfaces — validated (via Explore agent)

### Errors (resolves earlier audit conflict)

`@gala-chain/api` exports the full error hierarchy from `chain-api/src/utils/error.ts`:

- `ChainError` (abstract base, constructor `(message, payload?)`, has `code` mapping to HTTP status)
- `ConflictError` (409), `NotFoundError` (404), `DefaultError` (500), `ValidationFailedError`, `UnauthorizedError`, `ForbiddenError`
- Plus chaincode-side: `ObjectNotFoundError` (thrown by `getObjectByKey`), `ObjectValidationFailedError` (thrown by `putChainObject`)

The earlier conflicting agent missed the file — first audit was right. Confirmed import:
```ts
import { ConflictError, NotFoundError, DefaultError, ObjectNotFoundError } from "@gala-chain/api";
```

### DTOs

`@gala-chain/api` exports two base classes:
- `ChainCallDTO` — for `@Evaluate` (read-only) methods
- `SubmitCallDTO` — for `@Submit` (write) methods

Pattern from `AppleContract` / `PublicKeyContract`:
```ts
export class PlantAppleTreeDto extends SubmitCallDTO {
  @StringEnumProperty(Variety) variety!: Variety;
  @IsNumber() index!: number;
}
```
Each DTO includes class-validator decorators (`@IsString`, `@IsNumber`, `@IsOptional`, etc.) plus the SDK transform decorators (`@StringEnumProperty`, `@BigNumberProperty`).

### Repository pattern

`getObjectByKey` from `@gala-chain/chaincode/utils/state` **throws `ObjectNotFoundError`** when missing (does not return null). Standard wrapper shape:

```ts
async function findSession(ctx, id): Promise<Result<Option<GameSessionCO>, InfraError>> {
  try {
    const co = await getObjectByKey(ctx, GameSessionCO, GameSessionCO.getCompositeKey(id));
    return Ok(Some(co));
  } catch (err) {
    if (err instanceof ObjectNotFoundError) return Ok(None());
    return Err(InfraError.LedgerFailure(String(err)));
  }
}
```

`try/catch` lives **only inside** these wrappers per the playbook.

### Contract method shape

`@Submit({ in: DtoClass, out: "string", description: "..." })` for writes; `@Evaluate({...})` for reads. SDK auto-handles signature verification before the method body runs (per `@gala-chain/api/utils/signatures` — `isValid`, `recoverPublicKey`, `getPayloadToSign`).

## Decisions resolved before Plan freeze

### Q-A — ChainObject persistence: merge with domain or separate?

**Decision: Separate.** FEAT-003 ships pure domain interfaces; merging into ChainObject (Apple-example pattern) would retroactively couple the existing domain tests to the SDK. Better: create `GameSessionChainObject` and `SessionEventChainObject` classes in `apps/chaincode/src/persistence/`, with explicit `toDomain()` / `fromDomain()` converters. Repository deals only with persistence types; domain stays SDK-free.

Trade-off accepted: ~50 extra lines of converter code; payoff is preserved testability of the domain.

### Q-B — Composite key strategy

**Decision:**
- `GameSessionChainObject`: `@ChainKey({ position: 0 }) sessionId` (single-key composite)
- `SessionEventChainObject`: `@ChainKey({ position: 0 }) sessionId` + `@ChainKey({ position: 1 }) sequence` — events of one session co-locate naturally on the ledger, and reading "all events for session X" becomes a range scan.

### Q-C — `Option<T>` ↔ `T | null` conversion site

**Decision:** Inside the repository converter functions (`toDomain`/`fromDomain`). The persistence type stores `outcomeHash?: string` and `metadata?: Record<...>` (SDK-friendly nullable); the converter wraps reads with `Some` / `None` and unwraps writes via `match`. Domain code never sees `null`.

### Q-D — Signature verification responsibility

**Decision:** Delegate to the SDK. The `@Submit` / `@Evaluate` decorators handle signature verification before the method body runs (per `@gala-chain/api/utils/signatures`). We do **not** re-verify in our contract methods. The off-chain Rust verifier (FEAT-007) does its own independent verification — that's the redundancy that protects against compromised chaincode.

`signedBy` field stored in our domain `SessionEvent` is set from the recovered public key (or wallet identifier — to be confirmed at integration test time). Working assumption: it's the wallet identifier (e.g., `"client|alice"`) per SDK convention.

### Q-E — `@gala-chain/test` + bun:test compatibility

**Decision: try bun:test first; fallback gracefully if it fails.**

The SDK ships `chain-test/jest.config.ts` so the package itself is Jest-tested, but `TestChaincode` is just a class — no Jest-specific runtime. `bun:test` is largely Jest-API-compatible (`describe`, `test`, `expect`).

Plan: write G7 integration tests in `bun:test`. If `TestChaincode` import fails or behaves badly, document in `docs/open-questions.md` and either (a) add `jest` as a devDep just for chaincode integration tests, or (b) write thinner tests that exercise the contract via direct method calls without `TestChaincode`.

### Q-F — Status transition `Initiated → InProgress`

**Decision:** the **first** `appendCheckpoint` for a session in `Initiated` status causes the persisted session to update to `InProgress`. The contract method composes domain (which produces the new event) + a session-status update + repository writes (atomic via Fabric's transaction model). Adding a tiny pure function `transitionToInProgressIfNeeded(session)` in the domain to keep this logic testable.

## Open questions to flag in `docs/open-questions.md`

- **OQ-04 reword**: `@gala-chain/test` + `bun:test` compatibility — to validate at G7
- **OQ-07 (new)**: `signedBy` field — wallet identifier (`"client|alice"`) vs raw public key hex. Working assumption: wallet identifier per SDK convention. Confirm via the first integration test against a deployed chaincode.

## Plan-freeze checklist

- [x] All decisions resolved
- [x] No blockers — proceed to Plan

## Pragmatic note on scope and context

FEAT-004 is the largest feature in the project. If context becomes tight during execution, the natural cut is between **G6 (contract logic complete)** and **G7 (integration tests)**:

- G1–G6 form a coherent unit: data plumbing + contract methods + adapter
- G7 is a separable test phase that can land in a follow-up commit on the same branch (PR stays one)

If G7 stalls on `@gala-chain/test` + bun:test issues, fall back to a smaller "contract-method smoke test" subset using direct method invocation, not `TestChaincode`. Document the gap in OQ-04.
