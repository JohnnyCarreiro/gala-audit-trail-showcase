/**
 * `@gala-audit-trail/chaincode` — GalaChain audit trail chaincode.
 *
 * Layered design (per `docs/sdds/sdd-audit-trail-aggregate.md`):
 *
 *   - `src/domain/` — pure TS interfaces, const-object-as-enums, and use case
 *     functions returning `Result<T, DomainError>`. No SDK or I/O. (FEAT-003)
 *   - `src/infra/` — repository wrappers around the SDK ledger that catch
 *     SDK throws and return `Result<T, InfraError>`. (FEAT-004)
 *   - `src/contracts/` — `AuditTrailContract` extends `GalaContract`, composes
 *     domain + repository, and adapts terminal errors to `ChainError` at the
 *     SDK boundary (the only `throw` site). (FEAT-004)
 *
 * Single-line side-effect below registers `Ok` / `Err` / `Some` / `None` /
 * `match` on `globalThis` for every file in this workspace.
 */
import "reflect-metadata";
import "@gala-audit-trail/result-helpers/globals";

export * from "./contracts/audit-trail-contract";
export * from "./domain/index";
export * from "./dto/index";
