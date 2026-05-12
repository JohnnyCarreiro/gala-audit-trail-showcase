"use client";

import "@gala-audit-trail/result-helpers/globals";
import { ClientError } from "@/errors/client-error";
import {
  type MockEvent,
  type MockResult,
  type MockSession,
  mockAppendCheckpoint,
  mockFinalize,
  mockGetEvents,
  mockGetSession,
  mockInitiateSession,
  mockListSessions,
  mockReset,
  mockTamper,
  mockVerifyIntegrity,
  type Verdict,
} from "@/lib/mock-chain";

/**
 * Chain client adapter — wraps the chaincode surface into
 * `Result<T, ClientError>`. Today routes everything through the mock
 * backend in `lib/mock-chain.ts`; flipping `NEXT_PUBLIC_USE_REAL_CHAIN=1`
 * is the seam where a `@gala-chain/connect`-backed implementation would
 * plug in. No page or component imports the mock directly — they all
 * come through here, so the swap is one-file-localized.
 */

const realChainEnabled = (): boolean =>
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_USE_REAL_CHAIN === "1";

function liftMock<T>(r: MockResult<T>): Result<T, ClientError> {
  // `Ok(value)` returns `Ok<T>` which TS can't prove is identical to
  // `Ok<OkType<T>>` for an unconstrained `T` (the `OkType` conditional is
  // deferred). Cast at the boundary — the runtime is correct.
  if (r.ok) return Ok(r.data) as Result<T, ClientError>;
  return Err(ClientError.ChainReturnedError(r.error.ErrorKey, r.error.Message));
}

export interface InitiateInput {
  sessionId: string;
  gameId: string;
  players: string[];
  studioSigner: string;
  metadata?: Record<string, unknown>;
}

export async function initiateSession(
  input: InitiateInput,
): Promise<Result<MockSession, ClientError>> {
  if (realChainEnabled()) {
    // Future: BrowserConnectClient.submit(...) per ADR-0004. Today the
    // mock path is the only working route.
    return Err(
      ClientError.ChainNetworkError("Real chain mode not wired yet — see FEAT-005 follow-up"),
    );
  }
  return liftMock(await mockInitiateSession(input));
}

export interface AppendInput {
  sessionId: string;
  eventId: string;
  payload: Record<string, unknown>;
  signedBy: string;
}

export async function appendCheckpoint(
  input: AppendInput,
): Promise<Result<MockEvent, ClientError>> {
  if (realChainEnabled()) {
    return Err(
      ClientError.ChainNetworkError("Real chain mode not wired yet — see FEAT-005 follow-up"),
    );
  }
  return liftMock(
    await mockAppendCheckpoint({
      sessionId: input.sessionId,
      eventId: input.eventId,
      payload: input.payload,
      signedBy: input.signedBy,
    }),
  );
}

export interface FinalizeInput {
  sessionId: string;
  eventId: string;
  outcomeHash: string;
  signedBy: string;
}

export async function finalizeSession(
  input: FinalizeInput,
): Promise<Result<MockSession, ClientError>> {
  if (realChainEnabled()) {
    return Err(
      ClientError.ChainNetworkError("Real chain mode not wired yet — see FEAT-005 follow-up"),
    );
  }
  return liftMock(await mockFinalize(input));
}

export async function getSession(sessionId: string): Promise<Result<MockSession, ClientError>> {
  if (realChainEnabled()) {
    return Err(
      ClientError.ChainNetworkError("Real chain mode not wired yet — see FEAT-005 follow-up"),
    );
  }
  return liftMock(await mockGetSession(sessionId));
}

export async function getSessionEvents(
  sessionId: string,
): Promise<Result<MockEvent[], ClientError>> {
  if (realChainEnabled()) {
    return Err(
      ClientError.ChainNetworkError("Real chain mode not wired yet — see FEAT-005 follow-up"),
    );
  }
  return liftMock(await mockGetEvents(sessionId));
}

export async function verifyIntegrity(sessionId: string): Promise<Result<Verdict, ClientError>> {
  if (realChainEnabled()) {
    return Err(
      ClientError.ChainNetworkError("Real chain mode not wired yet — see FEAT-005 follow-up"),
    );
  }
  return liftMock(await mockVerifyIntegrity(sessionId));
}

// -- Demo-only helpers (mock backend) --------------------------------------
// These exist so the user can drive the verdict UI deterministically
// during the showcase. They are no-ops in real-chain mode.

export function resetMockChain(): void {
  if (realChainEnabled()) return;
  mockReset();
}

export async function tamperWithEvent(sessionId: string): Promise<Result<true, ClientError>> {
  if (realChainEnabled()) {
    return Err(ClientError.ChainNetworkError("Tamper demo unavailable in real chain mode"));
  }
  return liftMock(await mockTamper(sessionId));
}

export function listMockSessions(): MockSession[] {
  if (realChainEnabled()) return [];
  return mockListSessions();
}

export function isMockMode(): boolean {
  return !realChainEnabled();
}

export type { MockEvent, MockSession, Verdict };
