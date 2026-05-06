import { describe, expect, test } from "bun:test";
import { appendCheckpoint } from "../../../src/domain/append-checkpoint";
import { canonicalHashHex, GENESIS_HASH } from "../../../src/domain/canonical";
import { EventType, SessionStatus } from "../../../src/domain/types";
import { makeEvent, makeSession, OUTSIDER, PLAYER_A, STUDIO, TS } from "./_fixtures";

const baseInput = {
  sessionId: "sess-1",
  eventId: "evt-new",
  payload: { score: 42 },
  signedBy: PLAYER_A,
  signature: "0xsig",
  timestamp: TS,
};

describe("appendCheckpoint", () => {
  test("happy path: first checkpoint — sequence 1, prevHash GENESIS", () => {
    const session = makeSession({ status: SessionStatus.InProgress });
    const result = appendCheckpoint(session, None(), baseInput);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const event = result.value();
    expect(event.sequence).toBe(1);
    expect(event.prevHash).toBe(GENESIS_HASH);
    expect(event.eventType).toBe(EventType.Checkpoint);
    expect(event.signedBy).toBe(PLAYER_A);
  });

  test("happy path: subsequent checkpoint — sequence +1, prevHash links to last", () => {
    const session = makeSession({ status: SessionStatus.InProgress });
    const lastEvent = makeEvent({ sequence: 5 });
    const result = appendCheckpoint(session, Some(lastEvent), baseInput);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const event = result.value();
    expect(event.sequence).toBe(6);
    expect(event.prevHash).toBe(canonicalHashHex(lastEvent));
  });

  test("Inv. 1 — rejects when status is Completed", () => {
    const session = makeSession({ status: SessionStatus.Completed });
    const result = appendCheckpoint(session, None(), baseInput);

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.value()).toEqual({ SessionAlreadyCompleted: { sessionId: "sess-1" } });
  });

  test("Inv. 1 — rejects when status is Disputed", () => {
    const session = makeSession({ status: SessionStatus.Disputed });
    const result = appendCheckpoint(session, None(), baseInput);

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.value()).toEqual({ SessionAlreadyDisputed: { sessionId: "sess-1" } });
  });

  test("Inv. 3 — rejects when signedBy is an outsider (not in players ∪ studioSigner)", () => {
    const session = makeSession({ status: SessionStatus.InProgress });
    const result = appendCheckpoint(session, None(), { ...baseInput, signedBy: OUTSIDER });

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.value()).toEqual({
      UnauthorizedSigner: { sessionId: "sess-1", signer: OUTSIDER },
    });
  });

  test("Inv. 3 — accepts studioSigner even when not listed in players[]", () => {
    const session = makeSession({ status: SessionStatus.InProgress });
    const result = appendCheckpoint(session, None(), { ...baseInput, signedBy: STUDIO });

    expect(result.isOk()).toBe(true);
  });
});
