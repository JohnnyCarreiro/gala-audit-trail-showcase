import { canonicalHashHex, GENESIS_HASH } from "./canonical";
import { DomainError } from "./errors";
import {
  EventType,
  type FinalizeSessionInput,
  type GameSession,
  type SessionEvent,
  SessionStatus,
} from "./types";

/**
 * Result of finalizing a session: the updated session (now `Completed` with
 * `outcomeHash` set) plus the terminal `SessionCompleted` event for the chain.
 *
 * Both must be persisted atomically by the repository (FEAT-004).
 */
export interface FinalizeSessionResult {
  readonly session: GameSession;
  readonly event: SessionEvent;
}

/**
 * Finalize a session — set `outcomeHash`, transition status to `Completed`,
 * and produce the terminal `SessionCompleted` event.
 *
 * # Invariants exercised
 * - Inv. 1 / Inv. 4 — Status must be `Initiated` or `InProgress`; transitioning
 *   from `Completed` or `Disputed` is refused.
 * - Inv. 5 — `outcomeHash` is set exactly once; if already `Some`, refused.
 * - Inv. 3 — Only `studioSigner` can finalize (per ADR-0003 signer roles).
 *
 * # Status transition
 * `Initiated | InProgress → Completed`.
 *
 * # `prevHash`
 * `keccak256(canonical(lastEvent))` if `lastEvent.isSome()`, else `GENESIS_HASH`
 * (allowing finalize on a session with no checkpoints yet — degenerate but
 * legal: a 0-checkpoint session that ends immediately).
 */
export function finalizeSession(
  session: GameSession,
  lastEvent: Option<SessionEvent>,
  input: FinalizeSessionInput,
): Result<FinalizeSessionResult, DomainError> {
  if (session.status === SessionStatus.Completed) {
    return Err(DomainError.SessionAlreadyCompleted(session.sessionId));
  }
  if (session.status === SessionStatus.Disputed) {
    return Err(DomainError.SessionAlreadyDisputed(session.sessionId));
  }
  if (session.outcomeHash.isSome()) {
    return Err(DomainError.OutcomeAlreadySet(session.sessionId));
  }
  if (input.signedBy !== session.studioSigner) {
    return Err(DomainError.UnauthorizedSigner(session.sessionId, input.signedBy));
  }

  const sequence = lastEvent.isSome() ? lastEvent.value().sequence + 1 : 1;
  const prevHash = lastEvent.isSome() ? canonicalHashHex(lastEvent.value()) : GENESIS_HASH;

  const event: SessionEvent = {
    eventId: input.eventId,
    sessionId: session.sessionId,
    sequence,
    eventType: EventType.SessionCompleted,
    payload: { outcomeHash: input.outcomeHash },
    prevHash,
    signedBy: input.signedBy,
    signature: input.signature,
    timestamp: input.timestamp,
  };

  const updatedSession: GameSession = {
    ...session,
    status: SessionStatus.Completed,
    outcomeHash: Some(input.outcomeHash),
    updatedAt: input.timestamp,
  };

  return Ok({ session: updatedSession, event });
}
