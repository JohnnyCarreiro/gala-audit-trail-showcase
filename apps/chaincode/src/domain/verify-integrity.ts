import type { EnumValues } from "@gala-audit-trail/result-helpers";
import { canonicalHashHex, GENESIS_HASH } from "./canonical";
import type { DomainError } from "./errors";
import type { GameSession, SessionEvent } from "./types";

// -- Tampered reasons --------------------------------------------------------

export const TamperedReason = {
  /** Sequence numbers don't form 1, 2, 3, ..., N (gap or non-monotonic). */
  MissingSequence(sessionId: string, expected: number, actual: number) {
    return { MissingSequence: { sessionId, expected, actual } } as const;
  },
  /** An event's `prevHash` doesn't match `keccak256(canonical(previousEvent))`. */
  PrevHashMismatch(sessionId: string, sequence: number, expected: string, actual: string) {
    return { PrevHashMismatch: { sessionId, sequence, expected, actual } } as const;
  },
  /** An event was signed by a wallet that's not authorized for the session. */
  UnauthorizedSigner(sessionId: string, sequence: number, signer: string) {
    return { UnauthorizedSigner: { sessionId, sequence, signer } } as const;
  },
} as const;
export type TamperedReason = EnumValues<typeof TamperedReason>;

// -- Verdict -----------------------------------------------------------------

export const IntegrityVerdict = {
  Valid(eventsVerified: number) {
    return { Valid: { eventsVerified } } as const;
  },
  Tampered(eventsVerified: number, tamperedAt: number, reason: TamperedReason) {
    return { Tampered: { eventsVerified, tamperedAt, reason } } as const;
  },
} as const;
export type IntegrityVerdict = EnumValues<typeof IntegrityVerdict>;

// -- Verifier ----------------------------------------------------------------

/**
 * Walk the event chain and detect tampering. Pure: takes the session and its
 * events (already ordered by `sequence`), returns
 * `Result<IntegrityVerdict, DomainError>`.
 *
 * # Invariants exercised
 * - Inv. 2 — Sequence must be 1, 2, 3, ..., N (no gaps).
 * - Inv. 6 — Detects payload mutation via `prevHash` recomputation, and
 *   detects unauthorized signers (the caller-side role check from
 *   `appendCheckpoint` — re-validated retrospectively here in case events were
 *   inserted out of band).
 *
 * # Limitation
 * Cryptographic signature verification (validating `signature` against
 * `signedBy` over `canonical(eventMinusSignature)`) is **not** done here.
 * That requires bringing a secp256k1 library into the domain layer; the
 * showcase scope keeps it as a follow-up — the contract layer (FEAT-004)
 * already validates signatures at append time, so adding it here would be
 * double-defense. The off-chain Rust verifier (FEAT-007) does run the full
 * cryptographic check independently of the chaincode.
 *
 * # Output
 * - `Ok(Valid)` — chain is internally consistent.
 * - `Ok(Tampered)` — chain is broken; carries the `tamperedAt` sequence and
 *   the specific `TamperedReason`. Not an `Err` because the function did its
 *   job and produced an answer; an `Err` is reserved for "could not verify".
 * - `Err(DomainError)` — only when the inputs are themselves invalid (e.g.,
 *   `events` is empty for a non-Initiated session) — currently no such case.
 */
export function verifyIntegrity(
  session: GameSession,
  events: ReadonlyArray<SessionEvent>,
): Result<IntegrityVerdict, DomainError> {
  if (events.length === 0) {
    // Empty event log on a freshly initiated session is internally consistent.
    return Ok(IntegrityVerdict.Valid(0));
  }

  const allowedSigners = new Set<string>([session.studioSigner, ...session.players]);

  for (let i = 0; i < events.length; i++) {
    const event = events[i] as SessionEvent;
    const expectedSequence = i + 1;

    // Inv. 2 — sequence monotonicity.
    if (event.sequence !== expectedSequence) {
      return Ok(
        IntegrityVerdict.Tampered(
          i,
          expectedSequence,
          TamperedReason.MissingSequence(session.sessionId, expectedSequence, event.sequence),
        ),
      );
    }

    // Inv. 6 — prevHash chain.
    const expectedPrevHash =
      i === 0 ? GENESIS_HASH : canonicalHashHex(events[i - 1] as SessionEvent);
    if (event.prevHash !== expectedPrevHash) {
      return Ok(
        IntegrityVerdict.Tampered(
          i,
          event.sequence,
          TamperedReason.PrevHashMismatch(
            session.sessionId,
            event.sequence,
            expectedPrevHash,
            event.prevHash,
          ),
        ),
      );
    }

    // Inv. 3 / Inv. 6 — signer authorization re-check.
    if (!allowedSigners.has(event.signedBy)) {
      return Ok(
        IntegrityVerdict.Tampered(
          i,
          event.sequence,
          TamperedReason.UnauthorizedSigner(session.sessionId, event.sequence, event.signedBy),
        ),
      );
    }
  }

  return Ok(IntegrityVerdict.Valid(events.length));
}
