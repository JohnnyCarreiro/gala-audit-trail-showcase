import { canonicalHashHex, GENESIS_HASH } from "../../../src/domain/canonical";
import {
  EventType,
  type GameSession,
  type SessionEvent,
  SessionStatus,
} from "../../../src/domain/types";

export const STUDIO = "studio-signer";
export const PLAYER_A = "player-a";
export const PLAYER_B = "player-b";
export const OUTSIDER = "outsider-not-in-session";
export const TS = "2026-05-05T00:00:00Z";

export function makeSession(overrides: Partial<GameSession> = {}): GameSession {
  return {
    sessionId: "sess-1",
    gameId: "game-x",
    players: [PLAYER_A, PLAYER_B],
    studioSigner: STUDIO,
    status: SessionStatus.Initiated,
    createdAt: TS,
    updatedAt: TS,
    outcomeHash: None(),
    metadata: None(),
    ...overrides,
  };
}

export function makeEvent(overrides: Partial<SessionEvent> = {}): SessionEvent {
  return {
    eventId: "evt-1",
    sessionId: "sess-1",
    sequence: 1,
    eventType: EventType.Checkpoint,
    payload: { score: 0 },
    prevHash: GENESIS_HASH,
    signedBy: PLAYER_A,
    signature: "0xsig",
    timestamp: TS,
    ...overrides,
  };
}

/**
 * Build a chain of N valid checkpoint events with proper prevHash linking.
 * Useful for verify-integrity tests that need a known-valid baseline to mutate.
 */
export function buildValidChain(n: number, sessionId = "sess-1"): SessionEvent[] {
  const events: SessionEvent[] = [];
  for (let i = 1; i <= n; i++) {
    const prev = events[i - 2];
    events.push(
      makeEvent({
        eventId: `evt-${i}`,
        sessionId,
        sequence: i,
        prevHash: prev ? canonicalHashHex(prev) : GENESIS_HASH,
        payload: { score: i * 10 },
      }),
    );
  }
  return events;
}
