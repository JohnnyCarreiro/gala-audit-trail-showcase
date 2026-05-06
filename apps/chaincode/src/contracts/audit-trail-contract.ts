import { Evaluate, type GalaChainContext, GalaContract, Submit } from "@gala-chain/chaincode";
import { appendCheckpoint } from "../domain/append-checkpoint";
import { finalizeSession } from "../domain/finalize-session";
import { initiateSession } from "../domain/initiate-session";
import {
  type AppendCheckpointInput,
  type FinalizeSessionInput,
  type GameSession,
  type InitiateSessionInput,
  SessionStatus,
} from "../domain/types";
import { type IntegrityVerdict, verifyIntegrity } from "../domain/verify-integrity";
import { AppendCheckpointDto, FinalizeSessionDto, GetSessionDto, InitiateSessionDto } from "../dto";
import {
  findEventsBySession,
  findLastEvent,
  findSession,
  saveEvent,
  saveSession,
} from "../infra/session-repository";
import {
  type GameSessionChainObject,
  gameSessionFromDomain,
  type SessionEventChainObject,
  sessionEventFromDomain,
} from "../persistence";
import { domainErrorToChainError, infraErrorToChainError } from "./error-adapter";

/**
 * `AuditTrailContract` — GalaChain SDK boundary for the audit trail.
 *
 * Each method composes the pure domain (FEAT-003) + repository wrappers
 * (G4) via `Result`, and adapts the terminal failure to a `ChainError`
 * via `domainErrorToChainError` / `infraErrorToChainError` (G5). The
 * `throw` calls below are the **only** throws in this chaincode (the SDK
 * gateway converts them into HTTP error responses).
 *
 * Cryptographic signature verification on incoming DTOs is delegated to
 * the SDK — the `@Submit` / `@Evaluate` decorators handle it before the
 * method body runs (per ADR-0003 + ADR-0005). The off-chain Rust verifier
 * (FEAT-007) does an independent crypto re-check that doesn't trust the
 * chaincode at all.
 */
export class AuditTrailContract extends GalaContract {
  constructor() {
    super("AuditTrailContract", "0.1.0");
  }

  // -- Writes ----------------------------------------------------------------

  @Submit({
    in: InitiateSessionDto,
    description: "Initiate a new audit trail for a game session.",
  })
  public async InitiateSession(
    ctx: GalaChainContext,
    dto: InitiateSessionDto,
  ): Promise<GameSessionChainObject> {
    const timestamp = this.txTimestamp(ctx);

    const existing = await findSession(ctx, dto.sessionId);
    if (existing.isErr()) throw infraErrorToChainError(existing.value());

    const input: InitiateSessionInput = {
      sessionId: dto.sessionId,
      gameId: dto.gameId,
      players: dto.players,
      studioSigner: dto.studioSigner,
      metadata: dto.metadata !== undefined ? Some(dto.metadata) : None(),
      timestamp,
    };

    const created = initiateSession(input, existing.value());
    if (created.isErr()) throw domainErrorToChainError(created.value());

    const persisted = await saveSession(ctx, created.value());
    if (persisted.isErr()) throw infraErrorToChainError(persisted.value());

    return gameSessionFromDomain(created.value());
  }

  @Submit({
    in: AppendCheckpointDto,
    description: "Append a checkpoint event to an active session.",
  })
  public async AppendCheckpoint(
    ctx: GalaChainContext,
    dto: AppendCheckpointDto,
  ): Promise<SessionEventChainObject> {
    const timestamp = this.txTimestamp(ctx);
    const callingUser = ctx.callingUser;

    const sessionResult = await findSession(ctx, dto.sessionId);
    if (sessionResult.isErr()) throw infraErrorToChainError(sessionResult.value());
    const sessionOpt = sessionResult.value();
    if (sessionOpt.isNone()) {
      throw domainErrorToChainError({ SessionNotFound: { sessionId: dto.sessionId } });
    }
    const session = sessionOpt.value();

    const lastResult = await findLastEvent(ctx, dto.sessionId);
    if (lastResult.isErr()) throw infraErrorToChainError(lastResult.value());

    const input: AppendCheckpointInput = {
      sessionId: dto.sessionId,
      eventId: dto.eventId,
      payload: dto.payload,
      signedBy: callingUser,
      signature: dto.signature ?? "",
      timestamp,
    };

    const created = appendCheckpoint(session, lastResult.value(), input);
    if (created.isErr()) throw domainErrorToChainError(created.value());

    const eventPersisted = await saveEvent(ctx, created.value());
    if (eventPersisted.isErr()) throw infraErrorToChainError(eventPersisted.value());

    // Status transition `Initiated → InProgress` on first checkpoint (Q-F).
    if (session.status === SessionStatus.Initiated) {
      const updated: GameSession = {
        ...session,
        status: SessionStatus.InProgress,
        updatedAt: timestamp,
      };
      const sessionPersisted = await saveSession(ctx, updated);
      if (sessionPersisted.isErr()) throw infraErrorToChainError(sessionPersisted.value());
    }

    return sessionEventFromDomain(created.value());
  }

  @Submit({
    in: FinalizeSessionDto,
    description: "Finalize a session — set outcomeHash, transition to Completed.",
  })
  public async FinalizeSession(
    ctx: GalaChainContext,
    dto: FinalizeSessionDto,
  ): Promise<GameSessionChainObject> {
    const timestamp = this.txTimestamp(ctx);
    const callingUser = ctx.callingUser;

    const sessionResult = await findSession(ctx, dto.sessionId);
    if (sessionResult.isErr()) throw infraErrorToChainError(sessionResult.value());
    const sessionOpt = sessionResult.value();
    if (sessionOpt.isNone()) {
      throw domainErrorToChainError({ SessionNotFound: { sessionId: dto.sessionId } });
    }
    const session = sessionOpt.value();

    const lastResult = await findLastEvent(ctx, dto.sessionId);
    if (lastResult.isErr()) throw infraErrorToChainError(lastResult.value());

    const input: FinalizeSessionInput = {
      sessionId: dto.sessionId,
      eventId: dto.eventId,
      outcomeHash: dto.outcomeHash,
      signedBy: callingUser,
      signature: dto.signature ?? "",
      timestamp,
    };

    const finalized = finalizeSession(session, lastResult.value(), input);
    if (finalized.isErr()) throw domainErrorToChainError(finalized.value());

    const { session: updatedSession, event } = finalized.value();

    const eventPersisted = await saveEvent(ctx, event);
    if (eventPersisted.isErr()) throw infraErrorToChainError(eventPersisted.value());

    const sessionPersisted = await saveSession(ctx, updatedSession);
    if (sessionPersisted.isErr()) throw infraErrorToChainError(sessionPersisted.value());

    return gameSessionFromDomain(updatedSession);
  }

  // -- Reads -----------------------------------------------------------------

  @Evaluate({
    in: GetSessionDto,
    description: "Read the current state of a session.",
  })
  public async GetSession(
    ctx: GalaChainContext,
    dto: GetSessionDto,
  ): Promise<GameSessionChainObject> {
    const result = await findSession(ctx, dto.sessionId);
    if (result.isErr()) throw infraErrorToChainError(result.value());
    const sessionOpt = result.value();
    if (sessionOpt.isNone()) {
      throw domainErrorToChainError({ SessionNotFound: { sessionId: dto.sessionId } });
    }
    return gameSessionFromDomain(sessionOpt.value());
  }

  @Evaluate({
    in: GetSessionDto,
    description: "Read all events for a session, ordered by sequence.",
  })
  public async GetSessionEvents(
    ctx: GalaChainContext,
    dto: GetSessionDto,
  ): Promise<SessionEventChainObject[]> {
    const result = await findEventsBySession(ctx, dto.sessionId);
    if (result.isErr()) throw infraErrorToChainError(result.value());
    return result.value().map(sessionEventFromDomain);
  }

  @Evaluate({
    in: GetSessionDto,
    description: "Verify the integrity of a session's hash chain.",
  })
  public async VerifyIntegrity(
    ctx: GalaChainContext,
    dto: GetSessionDto,
  ): Promise<IntegrityVerdict> {
    const sessionResult = await findSession(ctx, dto.sessionId);
    if (sessionResult.isErr()) throw infraErrorToChainError(sessionResult.value());
    const sessionOpt = sessionResult.value();
    if (sessionOpt.isNone()) {
      throw domainErrorToChainError({ SessionNotFound: { sessionId: dto.sessionId } });
    }

    const eventsResult = await findEventsBySession(ctx, dto.sessionId);
    if (eventsResult.isErr()) throw infraErrorToChainError(eventsResult.value());

    const verdict = verifyIntegrity(sessionOpt.value(), eventsResult.value());
    if (verdict.isErr()) throw domainErrorToChainError(verdict.value());

    return verdict.value();
  }

  // -- Helpers ---------------------------------------------------------------

  /**
   * Deterministic transaction timestamp from the chain context. All peers
   * see the same ISO string for a given transaction — load-bearing for
   * downstream `prevHash` calculation and the off-chain Rust verifier.
   */
  private txTimestamp(ctx: GalaChainContext): string {
    return new Date(ctx.txUnixTime).toISOString();
  }
}
