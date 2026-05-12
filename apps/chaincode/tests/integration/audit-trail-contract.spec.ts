/**
 * FEAT-004 G7 — `AuditTrailContract` integration tests.
 *
 * Runs the contract end-to-end against `@gala-chain/test`'s `fixture()` harness:
 * builds a `TestChaincodeStub`-backed `ctx`, registers signing users, signs
 * DTOs with their secp256k1 private keys, and invokes the `@Submit` /
 * `@Evaluate` decorators (which auth + validate + dispatch).
 *
 * Covers the acceptance criteria of FEAT-004:
 *   - happy path (initiate → 2× checkpoint → finalize → verifyIntegrity)
 *   - edge: append to a completed session
 *   - edge: double finalize
 *   - edge: unauthorized signer
 *   - edge: verify on a tampered chain
 *
 * NB: signature verification is delegated to the SDK — `authenticate()`
 * overwrites `ctx.callingUserData` from the DTO sig, so signing with the
 * correct private key is load-bearing for these tests.
 */
// Spec imports specific src/* modules directly, so the side-effect that wires
// `Ok` / `Err` / `Some` / `None` / `match` onto `globalThis` (normally pulled
// by `src/index.ts`) is loaded here explicitly.
import "@gala-audit-trail/result-helpers/globals";
import "reflect-metadata";
import { describe, expect, test } from "bun:test";
import { createValidDTO, createValidSubmitDTO, GalaChainResponseType } from "@gala-chain/api";
import { randomUser } from "@gala-chain/test/lib/src/data/users";
import { fixture } from "@gala-chain/test/lib/src/unit";
import { AuditTrailContract } from "../../src/contracts/audit-trail-contract";
import { EventType, SessionStatus } from "../../src/domain/types";
import type { IntegrityVerdict } from "../../src/domain/verify-integrity";
import {
  AppendCheckpointDto,
  FinalizeSessionDto,
  GetSessionDto,
  InitiateSessionDto,
} from "../../src/dto";
import { GameSessionChainObject, sessionEventFromDomain } from "../../src/persistence";

// -- Test fixtures -----------------------------------------------------------

const SESSION_ID = "00000000-0000-4000-8000-000000000001";
const EVENT_1_ID = "00000000-0000-4000-8000-000000000a01";
const EVENT_2_ID = "00000000-0000-4000-8000-000000000a02";
const EVENT_FINAL_ID = "00000000-0000-4000-8000-000000000a99";
const OUTCOME_HASH = `0x${"a".repeat(64)}`;

function makeUsers() {
  return {
    studio: randomUser("client|studio"),
    alice: randomUser("client|alice"),
    bob: randomUser("client|bob"),
    outsider: randomUser("client|outsider"),
  };
}

function makeFixture(users: ReturnType<typeof makeUsers>) {
  // No `.callingUser(...)` — `@Submit` / `@Evaluate` run `authenticate()` which
  // sets `ctx.callingUserData` from the DTO signature. Pre-setting it would
  // collide with that and the SDK throws "Calling user already set".
  return fixture(AuditTrailContract).registeredUsers(
    users.studio,
    users.alice,
    users.bob,
    users.outsider,
  );
}

// `createValidSubmitDTO` returns a SignablePromise; `.signed()` is fluent.
async function buildInitiateDto(studioId: string, playerIds: string[], studioPrivateKey: string) {
  return createValidSubmitDTO(InitiateSessionDto, {
    sessionId: SESSION_ID,
    gameId: "game-test",
    players: playerIds,
    studioSigner: studioId,
  }).signed(studioPrivateKey);
}

async function buildCheckpointDto(
  eventId: string,
  payload: Record<string, unknown>,
  privateKey: string,
) {
  return createValidSubmitDTO(AppendCheckpointDto, {
    sessionId: SESSION_ID,
    eventId,
    payload,
  }).signed(privateKey);
}

async function buildFinalizeDto(privateKey: string) {
  return createValidSubmitDTO(FinalizeSessionDto, {
    sessionId: SESSION_ID,
    eventId: EVENT_FINAL_ID,
    outcomeHash: OUTCOME_HASH,
  }).signed(privateKey);
}

async function buildGetDto(privateKey: string) {
  return createValidDTO(GetSessionDto, {
    sessionId: SESSION_ID,
  }).signed(privateKey);
}

function expectSuccess<T>(response: { Status: number; Data?: T; Message?: string }): T {
  expect(response.Status).toBe(GalaChainResponseType.Success);
  return response.Data as T;
}

function expectError(response: { Status: number; ErrorKey?: string }): string {
  expect(response.Status).toBe(GalaChainResponseType.Error);
  return response.ErrorKey ?? "";
}

// -- Happy path --------------------------------------------------------------

describe("AuditTrailContract — happy path", () => {
  test("initiate → 2× checkpoint → finalize → verifyIntegrity returns Valid(3)", async () => {
    const users = makeUsers();
    const f = makeFixture(users);
    const playerIds = [users.alice.identityKey, users.bob.identityKey];

    const initiateDto = await buildInitiateDto(
      users.studio.identityKey,
      playerIds,
      users.studio.privateKey,
    );
    const initiated = await f.contract.InitiateSession(f.ctx, initiateDto);
    const session = expectSuccess(initiated as never) as { sessionId: string; status: string };
    expect(session.sessionId).toBe(SESSION_ID);
    expect(session.status).toBe(SessionStatus.Initiated);

    // Alice posts checkpoint 1 — should also transition the session Initiated → InProgress.
    const cp1Dto = await buildCheckpointDto(EVENT_1_ID, { score: 10 }, users.alice.privateKey);
    const cp1 = await f.contract.AppendCheckpoint(f.ctx, cp1Dto);
    const event1 = expectSuccess(cp1 as never) as { sequence: number; signedBy: string };
    expect(event1.sequence).toBe(1);
    expect(event1.signedBy).toBe(users.alice.identityKey);

    // Bob posts checkpoint 2.
    const cp2Dto = await buildCheckpointDto(EVENT_2_ID, { score: 25 }, users.bob.privateKey);
    const cp2 = await f.contract.AppendCheckpoint(f.ctx, cp2Dto);
    const event2 = expectSuccess(cp2 as never) as {
      sequence: number;
      signedBy: string;
      prevHash: string;
    };
    expect(event2.sequence).toBe(2);
    expect(event2.signedBy).toBe(users.bob.identityKey);
    expect(event2.prevHash).not.toBe(`0x${"0".repeat(64)}`); // genesis only for sequence 1

    // Studio finalizes.
    const finalDto = await buildFinalizeDto(users.studio.privateKey);
    const finalized = await f.contract.FinalizeSession(f.ctx, finalDto);
    const updated = expectSuccess(finalized as never) as { status: string; outcomeHash?: string };
    expect(updated.status).toBe(SessionStatus.Completed);
    expect(updated.outcomeHash).toBe(OUTCOME_HASH);

    // Read-side: events list + integrity verdict.
    const verifyDto = await buildGetDto(users.studio.privateKey);
    const verdictResp = await f.contract.VerifyIntegrity(f.ctx, verifyDto);
    const verdict = expectSuccess(verdictResp as never) as IntegrityVerdict;
    expect("Valid" in verdict).toBe(true);
    if ("Valid" in verdict) {
      expect(verdict.Valid.eventsVerified).toBe(3);
    }
  });
});

// -- Edge cases --------------------------------------------------------------

describe("AuditTrailContract — edges", () => {
  test("appending to a Completed session → CONFLICT (SessionAlreadyCompleted)", async () => {
    const users = makeUsers();
    const f = makeFixture(users);
    const playerIds = [users.alice.identityKey];

    await f.contract.InitiateSession(
      f.ctx,
      await buildInitiateDto(users.studio.identityKey, playerIds, users.studio.privateKey),
    );
    await f.contract.AppendCheckpoint(
      f.ctx,
      await buildCheckpointDto(EVENT_1_ID, { score: 1 }, users.alice.privateKey),
    );
    await f.contract.FinalizeSession(f.ctx, await buildFinalizeDto(users.studio.privateKey));

    const lateCheckpoint = await f.contract.AppendCheckpoint(
      f.ctx,
      await buildCheckpointDto(EVENT_2_ID, { score: 99 }, users.alice.privateKey),
    );
    const key = expectError(lateCheckpoint as never);
    // ADR-0005: SessionAlreadyCompleted → ConflictError (HTTP 409, key CONFLICT).
    expect(key).toBe("CONFLICT");
  });

  test("double-finalize → CONFLICT (SessionAlreadyCompleted)", async () => {
    const users = makeUsers();
    const f = makeFixture(users);

    await f.contract.InitiateSession(
      f.ctx,
      await buildInitiateDto(
        users.studio.identityKey,
        [users.alice.identityKey],
        users.studio.privateKey,
      ),
    );
    await f.contract.FinalizeSession(f.ctx, await buildFinalizeDto(users.studio.privateKey));

    const second = await f.contract.FinalizeSession(
      f.ctx,
      // Must build a fresh DTO — uniqueKey differs, preventing replay rejection
      // from masking the domain-level rejection we're after.
      await buildFinalizeDto(users.studio.privateKey),
    );
    const key = expectError(second as never);
    expect(key).toBe("CONFLICT");
  });

  test("unauthorized signer on AppendCheckpoint → FORBIDDEN (UnauthorizedSigner)", async () => {
    const users = makeUsers();
    const f = makeFixture(users);

    await f.contract.InitiateSession(
      f.ctx,
      await buildInitiateDto(
        users.studio.identityKey,
        [users.alice.identityKey],
        users.studio.privateKey,
      ),
    );

    const rogue = await f.contract.AppendCheckpoint(
      f.ctx,
      // outsider is registered (so signature verifies) but is NOT in players.
      await buildCheckpointDto(EVENT_1_ID, { score: 7 }, users.outsider.privateKey),
    );
    const key = expectError(rogue as never);
    // ADR-0005: UnauthorizedSigner → ForbiddenError (HTTP 403, key FORBIDDEN).
    expect(key).toBe("FORBIDDEN");
  });

  test("VerifyIntegrity reports Tampered on a pre-corrupted prevHash chain", async () => {
    const users = makeUsers();

    // Build a session + 2 events directly in state, with event #2 carrying a
    // bogus prevHash. Bypasses the write-then-mutate path (which the stub's
    // read cache obscures) and exercises the read-side verifier cleanly.
    const session = Object.assign(new GameSessionChainObject(), {
      sessionId: SESSION_ID,
      gameId: "game-test",
      players: [users.alice.identityKey],
      studioSigner: users.studio.identityKey,
      status: SessionStatus.InProgress,
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });
    const event1 = sessionEventFromDomain({
      eventId: EVENT_1_ID,
      sessionId: SESSION_ID,
      sequence: 1,
      eventType: EventType.Checkpoint,
      payload: { score: 10 },
      prevHash: `0x${"0".repeat(64)}`, // genesis
      signedBy: users.alice.identityKey,
      signature: "0xdead",
      timestamp: "2026-05-01T00:00:01.000Z",
    });
    const event2 = sessionEventFromDomain({
      eventId: EVENT_2_ID,
      sessionId: SESSION_ID,
      sequence: 2,
      eventType: EventType.Checkpoint,
      payload: { score: 20 },
      prevHash: `0x${"f".repeat(64)}`, // bogus — should be keccak(event1)
      signedBy: users.alice.identityKey,
      signature: "0xbeef",
      timestamp: "2026-05-01T00:00:02.000Z",
    });

    const f = fixture(AuditTrailContract)
      .registeredUsers(users.studio, users.alice, users.bob, users.outsider)
      .savedState(session, event1, event2);

    const verdictResp = await f.contract.VerifyIntegrity(
      f.ctx,
      await buildGetDto(users.studio.privateKey),
    );
    const verdict = expectSuccess(verdictResp as never) as IntegrityVerdict;
    expect("Tampered" in verdict).toBe(true);
    if ("Tampered" in verdict) {
      expect(verdict.Tampered.eventsVerified).toBe(1);
      expect(verdict.Tampered.tamperedAt).toBe(2);
      expect("PrevHashMismatch" in verdict.Tampered.reason).toBe(true);
    }
  });
});
