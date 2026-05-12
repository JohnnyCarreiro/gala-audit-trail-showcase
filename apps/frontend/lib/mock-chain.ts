"use client";

/**
 * In-memory + localStorage-backed mock of the chaincode contract.
 *
 * **Mock-mode default.** Flipping `NEXT_PUBLIC_USE_REAL_CHAIN=1` (and
 * shipping a real gateway URL) swaps `lib/galachain-client.ts` to the
 * real `@gala-chain/connect` adapter — none of this file changes.
 *
 * Mirrors `AuditTrailContract` surface from FEAT-004:
 *   - initiate / appendCheckpoint / finalize → return persisted shapes
 *   - getSession / getEvents → reads
 *   - verifyIntegrity → walks the chain locally with the same invariants
 *
 * Purposely faithful to the chaincode's error shapes (`CONFLICT`,
 * `FORBIDDEN`, `NOT_FOUND`) so the UI's `match` arms behave the same
 * against mock and real backends.
 */

const STORAGE_KEY = "gala-audit-trail:mock-chain:v1";

const GENESIS_HASH = `0x${"0".repeat(64)}`;

export interface MockSession {
  sessionId: string;
  gameId: string;
  players: string[];
  studioSigner: string;
  status: "INITIATED" | "IN_PROGRESS" | "COMPLETED";
  createdAt: string;
  updatedAt: string;
  outcomeHash?: string;
  metadata?: Record<string, unknown>;
}

export interface MockEvent {
  eventId: string;
  sessionId: string;
  sequence: number;
  eventType: "CHECKPOINT" | "SESSION_COMPLETED";
  payload: Record<string, unknown>;
  prevHash: string;
  signedBy: string;
  signature: string;
  timestamp: string;
}

interface MockState {
  sessions: Record<string, MockSession>;
  events: Record<string, MockEvent[]>; // keyed by sessionId
}

function emptyState(): MockState {
  return { sessions: {}, events: {} };
}

function loadState(): MockState {
  if (typeof window === "undefined") return emptyState();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyState();
  // Tolerant parsing — corrupted blob falls back to empty rather than
  // bricking the UI on a refresh.
  try {
    const parsed = JSON.parse(raw) as MockState;
    return {
      sessions: parsed.sessions ?? {},
      events: parsed.events ?? {},
    };
  } catch {
    return emptyState();
  }
}

function saveState(state: MockState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// -- Hash chain --------------------------------------------------------------
// Deterministic but **not** cryptographic — uses Web Crypto SHA-256 as a
// stand-in for keccak. Same algorithmic role (chain links), simpler dep
// footprint for the mock. The chain still detects mutation; the real
// off-chain verifier uses keccak256 (FEAT-007).
async function digestHex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return `0x${hex}`;
}

function canonicalize(value: unknown): string {
  // Recursive alphabetical key sort, no whitespace. Same shape contract
  // as the chaincode's `canonical.ts` for ASCII keys.
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",")}}`;
}

async function eventHash(event: MockEvent): Promise<string> {
  return digestHex(canonicalize(event));
}

// -- Mock errors mirroring chaincode mapping ---------------------------------
export interface MockChainError {
  Status: 0;
  ErrorKey: "CONFLICT" | "NOT_FOUND" | "FORBIDDEN" | "DEFAULT";
  Message: string;
}

function err(
  key: MockChainError["ErrorKey"],
  message: string,
): { ok: false; error: MockChainError } {
  return { ok: false, error: { Status: 0, ErrorKey: key, Message: message } };
}

function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

export type MockResult<T> = { ok: true; data: T } | { ok: false; error: MockChainError };

// -- Public mock API ---------------------------------------------------------

export interface InitiateInput {
  sessionId: string;
  gameId: string;
  players: string[];
  studioSigner: string;
  metadata?: Record<string, unknown>;
}

export async function mockInitiateSession(input: InitiateInput): Promise<MockResult<MockSession>> {
  const state = loadState();
  if (state.sessions[input.sessionId]) {
    return err("CONFLICT", `Session ${input.sessionId} already exists`);
  }
  const now = new Date().toISOString();
  const session: MockSession = {
    sessionId: input.sessionId,
    gameId: input.gameId,
    players: input.players,
    studioSigner: input.studioSigner,
    status: "INITIATED",
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata,
  };
  state.sessions[input.sessionId] = session;
  state.events[input.sessionId] = [];
  saveState(state);
  return ok(session);
}

export interface AppendInput {
  sessionId: string;
  eventId: string;
  payload: Record<string, unknown>;
  signedBy: string;
}

export async function mockAppendCheckpoint(input: AppendInput): Promise<MockResult<MockEvent>> {
  const state = loadState();
  const session = state.sessions[input.sessionId];
  if (!session) return err("NOT_FOUND", `Session ${input.sessionId} not found`);
  if (session.status === "COMPLETED") {
    return err("CONFLICT", `Session ${input.sessionId} is already completed`);
  }
  const allowed = new Set([session.studioSigner, ...session.players]);
  if (!allowed.has(input.signedBy)) {
    return err(
      "FORBIDDEN",
      `Signer ${input.signedBy} not authorized for session ${input.sessionId}`,
    );
  }
  const events = state.events[input.sessionId] ?? [];
  const lastEvent = events.length > 0 ? events[events.length - 1] : undefined;
  const prevHash = lastEvent ? await eventHash(lastEvent) : GENESIS_HASH;
  const event: MockEvent = {
    eventId: input.eventId,
    sessionId: input.sessionId,
    sequence: (lastEvent?.sequence ?? 0) + 1,
    eventType: "CHECKPOINT",
    payload: input.payload,
    prevHash,
    signedBy: input.signedBy,
    signature: `0xmock${Math.random().toString(16).slice(2, 10)}`,
    timestamp: new Date().toISOString(),
  };
  events.push(event);
  state.events[input.sessionId] = events;
  if (session.status === "INITIATED") {
    session.status = "IN_PROGRESS";
    session.updatedAt = event.timestamp;
    state.sessions[input.sessionId] = session;
  }
  saveState(state);
  return ok(event);
}

export interface FinalizeInput {
  sessionId: string;
  eventId: string;
  outcomeHash: string;
  signedBy: string;
}

export async function mockFinalize(input: FinalizeInput): Promise<MockResult<MockSession>> {
  const state = loadState();
  const session = state.sessions[input.sessionId];
  if (!session) return err("NOT_FOUND", `Session ${input.sessionId} not found`);
  if (session.status === "COMPLETED") {
    return err("CONFLICT", `Session ${input.sessionId} is already completed`);
  }
  if (input.signedBy !== session.studioSigner) {
    return err("FORBIDDEN", `Only ${session.studioSigner} can finalize ${input.sessionId}`);
  }
  const events = state.events[input.sessionId] ?? [];
  const lastEvent = events.length > 0 ? events[events.length - 1] : undefined;
  const prevHash = lastEvent ? await eventHash(lastEvent) : GENESIS_HASH;
  const closing: MockEvent = {
    eventId: input.eventId,
    sessionId: input.sessionId,
    sequence: (lastEvent?.sequence ?? 0) + 1,
    eventType: "SESSION_COMPLETED",
    payload: { outcomeHash: input.outcomeHash },
    prevHash,
    signedBy: input.signedBy,
    signature: `0xmock${Math.random().toString(16).slice(2, 10)}`,
    timestamp: new Date().toISOString(),
  };
  events.push(closing);
  state.events[input.sessionId] = events;
  session.status = "COMPLETED";
  session.outcomeHash = input.outcomeHash;
  session.updatedAt = closing.timestamp;
  state.sessions[input.sessionId] = session;
  saveState(state);
  return ok(session);
}

export async function mockGetSession(sessionId: string): Promise<MockResult<MockSession>> {
  const state = loadState();
  const session = state.sessions[sessionId];
  if (!session) return err("NOT_FOUND", `Session ${sessionId} not found`);
  return ok(session);
}

export async function mockGetEvents(sessionId: string): Promise<MockResult<MockEvent[]>> {
  const state = loadState();
  const session = state.sessions[sessionId];
  if (!session) return err("NOT_FOUND", `Session ${sessionId} not found`);
  return ok(state.events[sessionId] ?? []);
}

export type Verdict =
  | { kind: "valid"; eventsVerified: number }
  | {
      kind: "tampered";
      eventsVerified: number;
      tamperedAt: number;
      reason: string;
    };

export async function mockVerifyIntegrity(sessionId: string): Promise<MockResult<Verdict>> {
  const sessionResp = await mockGetSession(sessionId);
  if (!sessionResp.ok) return sessionResp;
  const eventsResp = await mockGetEvents(sessionId);
  if (!eventsResp.ok) return eventsResp;
  const events = [...eventsResp.data].sort((a, b) => a.sequence - b.sequence);
  let prev: MockEvent | undefined;
  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    if (!current) break; // unreachable given the loop bound; satisfies strict indexing
    const expected = i + 1;
    if (current.sequence !== expected) {
      return ok({
        kind: "tampered",
        eventsVerified: i,
        tamperedAt: expected,
        reason: `Missing sequence ${expected}, got ${current.sequence}`,
      });
    }
    const expectedPrev = prev ? await eventHash(prev) : GENESIS_HASH;
    if (current.prevHash !== expectedPrev) {
      return ok({
        kind: "tampered",
        eventsVerified: i,
        tamperedAt: current.sequence,
        reason: `prevHash mismatch at sequence ${current.sequence}`,
      });
    }
    prev = current;
  }
  return ok({ kind: "valid", eventsVerified: events.length });
}

/**
 * Demo helper exposed via the dev panel — wipes the mock chain so the
 * user can replay scenarios cleanly.
 */
export function mockReset(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * Demo helper — corrupts a stored event to drive the Tampered verdict
 * on demand.
 */
export async function mockTamper(sessionId: string): Promise<MockResult<true>> {
  const state = loadState();
  const events = state.events[sessionId] ?? [];
  const target = events[1];
  if (!target) {
    return err("CONFLICT", "Need at least 2 events to demo a tamper");
  }
  events[1] = {
    ...target,
    payload: { ...target.payload, _tampered: Date.now() },
  };
  state.events[sessionId] = events;
  saveState(state);
  return ok(true);
}

export function mockListSessions(): MockSession[] {
  return Object.values(loadState().sessions).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
