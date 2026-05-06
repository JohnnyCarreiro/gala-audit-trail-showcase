import { plainToInstance } from "class-transformer";
import type { GameSession, SessionEvent } from "../domain/types";
import { GameSessionChainObject } from "./game-session-chain-object";
import { SessionEventChainObject } from "./session-event-chain-object";

/**
 * Conversion between the SDK persistence shape (`GameSessionChainObject`,
 * nullable fields) and the pure-domain shape (`GameSession`, `Option<T>`).
 * This is the single boundary where `T | null/undefined ↔ Option<T>` flips —
 * domain code never sees `null`, persistence code never sees `Option`.
 */

// -- GameSession -------------------------------------------------------------

export function gameSessionToDomain(co: GameSessionChainObject): GameSession {
  return {
    sessionId: co.sessionId,
    gameId: co.gameId,
    players: co.players,
    studioSigner: co.studioSigner,
    status: co.status,
    createdAt: co.createdAt,
    updatedAt: co.updatedAt,
    outcomeHash: co.outcomeHash !== undefined ? Some(co.outcomeHash) : None(),
    metadata: co.metadata !== undefined ? Some(co.metadata) : None(),
  };
}

export function gameSessionFromDomain(s: GameSession): GameSessionChainObject {
  // Use plainToInstance so the SDK's ChainObject machinery (validation,
  // serialization) wires up correctly — direct `new`-then-assign loses some
  // of the metadata.
  const plain: Record<string, unknown> = {
    sessionId: s.sessionId,
    gameId: s.gameId,
    players: [...s.players],
    studioSigner: s.studioSigner,
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
  if (s.outcomeHash.isSome()) plain.outcomeHash = s.outcomeHash.value();
  if (s.metadata.isSome()) plain.metadata = s.metadata.value();
  return plainToInstance(GameSessionChainObject, plain);
}

// -- SessionEvent ------------------------------------------------------------

export function sessionEventToDomain(co: SessionEventChainObject): SessionEvent {
  return {
    eventId: co.eventId,
    sessionId: co.sessionId,
    sequence: co.sequence,
    eventType: co.eventType,
    payload: co.payload,
    prevHash: co.prevHash,
    signedBy: co.signedBy,
    signature: co.signature,
    timestamp: co.timestamp,
  };
}

export function sessionEventFromDomain(e: SessionEvent): SessionEventChainObject {
  return plainToInstance(SessionEventChainObject, {
    eventId: e.eventId,
    sessionId: e.sessionId,
    sequence: e.sequence,
    eventType: e.eventType,
    payload: e.payload,
    prevHash: e.prevHash,
    signedBy: e.signedBy,
    signature: e.signature,
    timestamp: e.timestamp,
  });
}
