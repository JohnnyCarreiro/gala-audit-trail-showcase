import { NotFoundError } from "@gala-chain/api";
import {
  type GalaChainContext,
  getObjectByKey,
  getObjectsByPartialCompositeKey,
  putChainObject,
} from "@gala-chain/chaincode";
import type { GameSession, SessionEvent } from "../domain/types";
import {
  GameSessionChainObject,
  gameSessionFromDomain,
  gameSessionToDomain,
  SessionEventChainObject,
  sessionEventFromDomain,
  sessionEventToDomain,
} from "../persistence";
import { InfraError } from "./errors";

/**
 * Session repository — the **only** site in the chaincode where `try/catch`
 * appears. Every SDK call that can throw is wrapped here and converted into
 * a `Result<..., InfraError>`. Domain code, contract methods, and adapters
 * never see thrown SDK exceptions.
 *
 * # Pattern
 * - Read returning "may not exist": `Result<Option<T>, InfraError>` —
 *   `NotFoundError` becomes `Ok(None())`, not an `Err`.
 * - Read returning a list: `Result<T[], InfraError>` — empty list is `Ok([])`.
 * - Write: `Result<void, InfraError>`.
 *
 * # See also
 * - [ADR-0005](../../../../docs/adrs/0005-result-type-domain-boundary.md)
 * - [`docs/playbook.md`](../../../../docs/playbook.md) — boundary discipline
 */

// -- GameSession reads/writes -----------------------------------------------

export async function findSession(
  ctx: GalaChainContext,
  sessionId: string,
): Promise<Result<Option<GameSession>, InfraError>> {
  try {
    const co = await getObjectByKey(
      ctx,
      GameSessionChainObject,
      GameSessionChainObject.getCompositeKeyFromParts(GameSessionChainObject.INDEX_KEY, [
        sessionId,
      ]),
    );
    return Ok(Some(gameSessionToDomain(co)));
  } catch (err) {
    if (err instanceof NotFoundError) return Ok(None());
    return Err(InfraError.LedgerFailure(String(err)));
  }
}

export async function saveSession(
  ctx: GalaChainContext,
  session: GameSession,
): Promise<Result<void, InfraError>> {
  try {
    const co = gameSessionFromDomain(session);
    await putChainObject(ctx, co);
    return Ok(undefined);
  } catch (err) {
    return Err(InfraError.LedgerFailure(String(err)));
  }
}

// -- SessionEvent reads/writes ----------------------------------------------

export async function findLastEvent(
  ctx: GalaChainContext,
  sessionId: string,
): Promise<Result<Option<SessionEvent>, InfraError>> {
  const allResult = await findEventsBySession(ctx, sessionId);
  if (allResult.isErr()) return allResult;
  const events = allResult.value();
  if (events.length === 0) return Ok(None());
  // Highest sequence wins. Repository sorts already via composite key range
  // scan, but defensively pick the max in case ordering differs.
  const last = events.reduce((acc, e) => (e.sequence > acc.sequence ? e : acc));
  return Ok(Some(last));
}

export async function findEventsBySession(
  ctx: GalaChainContext,
  sessionId: string,
): Promise<Result<SessionEvent[], InfraError>> {
  try {
    const cos = await getObjectsByPartialCompositeKey(
      ctx,
      SessionEventChainObject.INDEX_KEY,
      [sessionId],
      SessionEventChainObject,
    );
    const events = cos.map(sessionEventToDomain).sort((a, b) => a.sequence - b.sequence);
    return Ok(events);
  } catch (err) {
    return Err(InfraError.LedgerFailure(String(err)));
  }
}

export async function saveEvent(
  ctx: GalaChainContext,
  event: SessionEvent,
): Promise<Result<void, InfraError>> {
  try {
    const co = sessionEventFromDomain(event);
    await putChainObject(ctx, co);
    return Ok(undefined);
  } catch (err) {
    return Err(InfraError.LedgerFailure(String(err)));
  }
}
