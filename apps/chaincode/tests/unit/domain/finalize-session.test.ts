import { describe, expect, test } from "bun:test";
import { finalizeSession } from "../../../src/domain/finalize-session";
import { EventType, SessionStatus } from "../../../src/domain/types";
import { makeSession, PLAYER_A, STUDIO, TS } from "./_fixtures";

const baseInput = {
  sessionId: "sess-1",
  eventId: "evt-final",
  outcomeHash: "0xdeadbeef",
  signedBy: STUDIO,
  signature: "0xsig",
  timestamp: TS,
};

describe("finalizeSession", () => {
  test("happy path — status InProgress → Completed, outcomeHash set, terminal event produced", () => {
    const session = makeSession({ status: SessionStatus.InProgress });
    const result = finalizeSession(session, None(), baseInput);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const { session: updated, event } = result.value();

    expect(updated.status).toBe(SessionStatus.Completed);
    expect(updated.outcomeHash.isSome()).toBe(true);
    if (updated.outcomeHash.isSome()) {
      expect(updated.outcomeHash.value()).toBe("0xdeadbeef");
    }
    expect(event.eventType).toBe(EventType.SessionCompleted);
    expect(event.payload).toEqual({ outcomeHash: "0xdeadbeef" });
  });

  test("Inv. 1 / Inv. 4 — rejects when status is already Completed", () => {
    const session = makeSession({
      status: SessionStatus.Completed,
      outcomeHash: Some("0xprior"),
    });
    const result = finalizeSession(session, None(), baseInput);

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.value()).toEqual({ SessionAlreadyCompleted: { sessionId: "sess-1" } });
  });

  test("Inv. 4 — rejects when status is Disputed", () => {
    const session = makeSession({ status: SessionStatus.Disputed });
    const result = finalizeSession(session, None(), baseInput);

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.value()).toEqual({ SessionAlreadyDisputed: { sessionId: "sess-1" } });
  });

  test("Inv. 5 — rejects when outcomeHash is already set (immutability)", () => {
    const session = makeSession({
      status: SessionStatus.InProgress,
      outcomeHash: Some("0xprior"),
    });
    const result = finalizeSession(session, None(), baseInput);

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.value()).toEqual({ OutcomeAlreadySet: { sessionId: "sess-1" } });
  });

  test("Inv. 3 — rejects when signedBy is not the studioSigner (player can't finalize)", () => {
    const session = makeSession({ status: SessionStatus.InProgress });
    const result = finalizeSession(session, None(), { ...baseInput, signedBy: PLAYER_A });

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.value()).toEqual({
      UnauthorizedSigner: { sessionId: "sess-1", signer: PLAYER_A },
    });
  });
});
