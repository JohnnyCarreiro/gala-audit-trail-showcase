import { DomainError } from "./errors";
import { type GameSession, type InitiateSessionInput, SessionStatus } from "./types";

/**
 * Initiate a new GameSession.
 *
 * # Invariants exercised
 * - Inv. 1 (status transition): only `Initiated` is a valid starting status,
 *   enforced by construction here.
 * - SessionAlreadyExists: refused if `existing.isSome()`.
 *
 * # Inputs
 * - `input` — caller-supplied session details (id, game, players, signer, ts).
 * - `existing` — `Some(session)` if a session with this id already exists,
 *   otherwise `None()`. The repository (FEAT-004) is responsible for the
 *   lookup; this use case stays pure.
 *
 * # Output
 * - `Ok(GameSession)` with status `Initiated`, `outcomeHash: None`.
 * - `Err(DomainError.SessionAlreadyExists)` if a session with this id exists.
 */
export function initiateSession(
  input: InitiateSessionInput,
  existing: Option<GameSession>,
): Result<GameSession, DomainError> {
  if (existing.isSome()) {
    return Err(DomainError.SessionAlreadyExists(input.sessionId));
  }
  return Ok({
    sessionId: input.sessionId,
    gameId: input.gameId,
    players: input.players,
    studioSigner: input.studioSigner,
    status: SessionStatus.Initiated,
    createdAt: input.timestamp,
    updatedAt: input.timestamp,
    outcomeHash: None(),
    metadata: input.metadata,
  });
}
