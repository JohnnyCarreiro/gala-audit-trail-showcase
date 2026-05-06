import { describe, expect, test } from "bun:test";
import { SessionStatus } from "../../../src/domain/types";
import { verifyIntegrity } from "../../../src/domain/verify-integrity";
import { buildValidChain, makeSession, OUTSIDER } from "./_fixtures";

describe("verifyIntegrity", () => {
  test("empty event log on a fresh session is Valid", () => {
    const session = makeSession();
    const result = verifyIntegrity(session, []);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value()).toEqual({ Valid: { eventsVerified: 0 } });
  });

  test("happy path — a valid chain of 5 events is Valid", () => {
    const session = makeSession({ status: SessionStatus.InProgress });
    const events = buildValidChain(5);
    const result = verifyIntegrity(session, events);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value()).toEqual({ Valid: { eventsVerified: 5 } });
  });

  test("Inv. 2 — detects sequence gap (1, 2, 4 — missing 3)", () => {
    const session = makeSession({ status: SessionStatus.InProgress });
    const events = buildValidChain(3);
    // Drop the middle event; rebuild prevHash on the third manually so only the
    // sequence is the issue. Easier: just splice and let the verifier catch it.
    const tampered = [events[0], events[1], { ...events[2], sequence: 4 }] as typeof events;

    const result = verifyIntegrity(session, tampered);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const verdict = result.value();
    expect(verdict).toMatchObject({
      Tampered: {
        tamperedAt: 3,
        reason: { MissingSequence: { expected: 3, actual: 4 } },
      },
    });
  });

  test("Inv. 6 — detects payload mutation via prevHash mismatch on subsequent event", () => {
    const session = makeSession({ status: SessionStatus.InProgress });
    const events = buildValidChain(3);
    // Mutate event[1]'s payload but DON'T recompute event[2]'s prevHash; the
    // chain should break at event[2] because its prevHash no longer matches
    // canonical(mutated event[1]).
    const tampered = [
      events[0],
      { ...events[1], payload: { score: 9999 } },
      events[2],
    ] as typeof events;

    const result = verifyIntegrity(session, tampered);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const verdict = result.value();
    expect(verdict).toMatchObject({
      Tampered: {
        tamperedAt: 3,
        reason: { PrevHashMismatch: { sequence: 3 } },
      },
    });
  });

  test("Inv. 6 — detects unauthorized signer in the chain (retrospective signer check)", () => {
    const session = makeSession({ status: SessionStatus.InProgress });
    const events = buildValidChain(2);
    // Replace event[1]'s signer with an outsider — the prevHash chain still
    // matches (we haven't changed the payload), but the signer authorization
    // re-check catches it.
    const tampered = [events[0], { ...events[1], signedBy: OUTSIDER }] as typeof events;

    const result = verifyIntegrity(session, tampered);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const verdict = result.value();
    expect(verdict).toMatchObject({
      Tampered: {
        tamperedAt: 2,
        reason: { UnauthorizedSigner: { sequence: 2, signer: OUTSIDER } },
      },
    });
  });
});
