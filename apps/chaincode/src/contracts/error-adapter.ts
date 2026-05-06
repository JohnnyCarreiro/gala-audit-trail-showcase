import {
  type ChainError,
  ConflictError,
  DefaultError,
  ForbiddenError,
  NotFoundError,
} from "@gala-chain/api";
import type { DomainError } from "../domain/errors";
import type { InfraError } from "../infra/errors";

/**
 * Maps `DomainError` variants → `ChainError` subclasses for the SDK boundary.
 *
 * Mapping policy (per ADR-0005):
 *   - "Already exists / status conflict / immutability violations"
 *     → `ConflictError` (409) — the current state of the resource conflicts
 *     with the request
 *   - "Not found"                  → `NotFoundError` (404)
 *   - "Authorization denied"       → `ForbiddenError` (403) — caller lacks
 *     permission for this operation; distinct from "not authenticated"
 *   - "Internal integrity failure" → `DefaultError` (500) — sequence
 *     violations and signature anomalies are anomalies that shouldn't reach
 *     the contract layer if upstream validation worked
 *
 * The `match` is exhaustive — adding a `DomainError` variant breaks the
 * type-check until this mapping is updated. That's the senior signal.
 */
export function domainErrorToChainError(err: DomainError): ChainError {
  return match(err, {
    SessionAlreadyExists: ({ sessionId }) =>
      new ConflictError(`Session ${sessionId} already exists`),
    SessionNotFound: ({ sessionId }) => new NotFoundError(`Session ${sessionId} not found`),
    SessionAlreadyCompleted: ({ sessionId }) =>
      new ConflictError(`Session ${sessionId} is already completed`),
    SessionAlreadyDisputed: ({ sessionId }) =>
      new ConflictError(`Session ${sessionId} is in dispute`),
    InvalidEventSequence: ({ sessionId, expected, actual }) =>
      new DefaultError(
        `Invalid event sequence for session ${sessionId}: expected ${expected}, got ${actual}`,
      ),
    UnauthorizedSigner: ({ sessionId, signer }) =>
      new ForbiddenError(`Signer ${signer} not authorized for session ${sessionId}`),
    InvalidStatusTransition: ({ sessionId, from, to }) =>
      new ConflictError(`Cannot transition session ${sessionId} from ${from} to ${to}`),
    OutcomeAlreadySet: ({ sessionId }) =>
      new ConflictError(`Outcome already set on session ${sessionId} (immutable)`),
    InvalidSignature: ({ sessionId, eventId }) =>
      new ForbiddenError(`Invalid signature on event ${eventId} of session ${sessionId}`),
  });
}

/**
 * Maps `InfraError` variants → `ChainError`. Both current variants
 * (`LedgerFailure`, `SerializationError`) are technical anomalies, not
 * caller-faceable; both go to `DefaultError` (500).
 */
export function infraErrorToChainError(err: InfraError): ChainError {
  return match(err, {
    LedgerFailure: ({ cause }) => new DefaultError(`Ledger failure: ${cause}`),
    SerializationError: ({ cause }) => new DefaultError(`Serialization failure: ${cause}`),
  });
}
