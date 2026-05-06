import { canonicalHashHex, GENESIS_HASH } from "./canonical";
import { DomainError } from "./errors";
import {
  type AppendCheckpointInput,
  EventType,
  type GameSession,
  type SessionEvent,
  SessionStatus,
} from "./types";

/**
 * Append a checkpoint event to an active session. Pure: takes the current
 * session state, the last event (for the hash chain), and the input; returns
 * `Result<SessionEvent, DomainError>`.
 *
 * # Invariants exercised
 * - Inv. 1 — Cannot append to `Completed` or `Disputed` sessions.
 * - Inv. 2 — `sequence` is computed as `lastEvent.sequence + 1` (or 1 if
 *   `lastEvent` is `None`); strictly monotonic, no gaps. Enforced by
 *   construction here; `verifyIntegrity` enforces it retrospectively when
 *   reading.
 * - Inv. 3 — `signedBy` must be in `session.players` or equal `session.studioSigner`.
 *
 * # Status transition (caller's job)
 * After this use case succeeds, the session moves `Initiated → InProgress`
 * (if it was `Initiated`). The repository in FEAT-004 applies that update
 * alongside persisting the new event.
 *
 * # `prevHash`
 * `keccak256(canonical(lastEvent))` if `lastEvent.isSome()`, else `GENESIS_HASH`.
 */
export function appendCheckpoint(
  session: GameSession,
  lastEvent: Option<SessionEvent>,
  input: AppendCheckpointInput,
): Result<SessionEvent, DomainError> {
  if (session.status === SessionStatus.Completed) {
    return Err(DomainError.SessionAlreadyCompleted(session.sessionId));
  }
  if (session.status === SessionStatus.Disputed) {
    return Err(DomainError.SessionAlreadyDisputed(session.sessionId));
  }

  const allowedSigners = new Set<string>([session.studioSigner, ...session.players]);
  if (!allowedSigners.has(input.signedBy)) {
    return Err(DomainError.UnauthorizedSigner(session.sessionId, input.signedBy));
  }

  const sequence = lastEvent.isSome() ? lastEvent.value().sequence + 1 : 1;
  const prevHash = lastEvent.isSome() ? canonicalHashHex(lastEvent.value()) : GENESIS_HASH;

  return Ok({
    eventId: input.eventId,
    sessionId: session.sessionId,
    sequence,
    eventType: EventType.Checkpoint,
    payload: input.payload,
    prevHash,
    signedBy: input.signedBy,
    signature: input.signature,
    timestamp: input.timestamp,
  });
}
