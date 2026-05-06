/**
 * Pure domain types for the audit trail aggregate.
 *
 * # Invariants (see `docs/sdds/sdd-audit-trail-aggregate.md` §4)
 * Each invariant is exercised by at least one unit test.
 *
 * # See also
 * - [SDD-001](../../../../docs/sdds/sdd-audit-trail-aggregate.md)
 * - [ADR-0001](../../../../docs/adrs/0001-domain-model.md) — split
 *   GameSession / SessionEvent rationale
 * - [ADR-0002](../../../../docs/adrs/0002-event-sequencing.md) — hash chain
 */

// -- SessionStatus -----------------------------------------------------------

export const SessionStatus = {
  Initiated: "INITIATED",
  InProgress: "IN_PROGRESS",
  Completed: "COMPLETED",
  Disputed: "DISPUTED",
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

// -- EventType ---------------------------------------------------------------

export const EventType = {
  SessionStarted: "SESSION_STARTED",
  Checkpoint: "CHECKPOINT",
  SessionCompleted: "SESSION_COMPLETED",
  DisputeRaised: "DISPUTE_RAISED",
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

// -- Aggregate root ----------------------------------------------------------

/**
 * GameSession — the aggregate root.
 *
 * Lifecycle: `Initiated → InProgress → Completed | Disputed`.
 * `outcomeHash` is `Some` only when status is `Completed`; immutable after set.
 */
export interface GameSession {
  readonly sessionId: string;
  readonly gameId: string;
  /** Wallet identifiers authorized to sign checkpoints in this session. */
  readonly players: ReadonlyArray<string>;
  readonly status: SessionStatus;
  /** Wallet identifier of the studio signer (always allowed; FEAT-003 ADR-0003). */
  readonly studioSigner: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Hash of the off-chain outcome data; `Some` only when status === Completed. */
  readonly outcomeHash: Option<string>;
  /** Free-form game-specific extras. */
  readonly metadata: Option<Readonly<Record<string, unknown>>>;
}

// -- Event entity ------------------------------------------------------------

/**
 * SessionEvent — entity inside the GameSession aggregate; persisted with
 * a composite key of (sessionId, sequence) so events of a session co-locate.
 *
 * `prevHash` links each event to its predecessor (`keccak256(canonical(prev))`),
 * forming a Merkle-like chain that the on-chain `verifyIntegrity` and the
 * off-chain Rust verifier both walk to detect tampering.
 */
export interface SessionEvent {
  readonly eventId: string;
  readonly sessionId: string;
  /** Strictly monotonic, starts at 1; no gaps. */
  readonly sequence: number;
  readonly eventType: EventType;
  readonly payload: Readonly<Record<string, unknown>>;
  /** keccak256 of canonical(previousEvent) as `0x<64-hex>`. Genesis: 32 zero bytes. */
  readonly prevHash: string;
  /** Wallet identifier of the signer. */
  readonly signedBy: string;
  /** secp256k1 signature in `r || s || v` hex (per ADR-0003). */
  readonly signature: string;
  readonly timestamp: string;
}

// -- Inputs to use cases -----------------------------------------------------

export interface InitiateSessionInput {
  readonly sessionId: string;
  readonly gameId: string;
  readonly players: ReadonlyArray<string>;
  readonly studioSigner: string;
  readonly metadata: Option<Readonly<Record<string, unknown>>>;
  readonly timestamp: string;
}

export interface AppendCheckpointInput {
  readonly sessionId: string;
  readonly eventId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly signedBy: string;
  readonly signature: string;
  readonly timestamp: string;
}

export interface FinalizeSessionInput {
  readonly sessionId: string;
  readonly eventId: string;
  readonly outcomeHash: string;
  readonly signedBy: string;
  readonly signature: string;
  readonly timestamp: string;
}
