import { describe, expect, test } from "bun:test";
import { initiateSession } from "../../../src/domain/initiate-session";
import { type InitiateSessionInput, SessionStatus } from "../../../src/domain/types";
import { makeSession, PLAYER_A, PLAYER_B, STUDIO, TS } from "./_fixtures";

const baseInput: InitiateSessionInput = {
  sessionId: "sess-1",
  gameId: "game-x",
  players: [PLAYER_A, PLAYER_B],
  studioSigner: STUDIO,
  metadata: None(),
  timestamp: TS,
};

describe("initiateSession", () => {
  test("happy path: returns a fresh session with status Initiated and None outcome", () => {
    const result = initiateSession(baseInput, None());
    expect(result.isOk()).toBe(true);

    if (!result.isOk()) return;
    const session = result.value();
    expect(session.sessionId).toBe("sess-1");
    expect(session.status).toBe(SessionStatus.Initiated);
    expect(session.outcomeHash.isNone()).toBe(true);
    expect(session.players).toEqual([PLAYER_A, PLAYER_B]);
    expect(session.studioSigner).toBe(STUDIO);
  });

  test("rejects when a session with the same id already exists", () => {
    const existing = makeSession();
    const result = initiateSession(baseInput, Some(existing));

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.value()).toEqual({ SessionAlreadyExists: { sessionId: "sess-1" } });
  });
});
