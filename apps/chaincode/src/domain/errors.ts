import type { EnumValues } from "@gala-audit-trail/result-helpers";
import type { SessionStatus } from "./types";

/**
 * `DomainError` — domain-layer failures of the audit trail aggregate.
 *
 * Const-object-as-enum + `EnumValues<typeof X>` pattern (see `docs/playbook.md`):
 * each variant carries the offending payload so the contract layer adapter
 * (FEAT-004) can build informative `ChainError` messages, and so callers can
 * `match` without losing the discriminator.
 *
 * # Variants
 * - `SessionAlreadyExists` — `initiateSession` called twice with the same id
 * - `SessionNotFound` — operation references an unknown session
 * - `SessionAlreadyCompleted` — operation requires non-completed status
 * - `SessionAlreadyDisputed` — operation requires non-disputed status
 * - `InvalidEventSequence` — sequence not strictly +1 (Inv. 2)
 * - `UnauthorizedSigner` — signer not in players or studio signer (Inv. 3)
 * - `InvalidStatusTransition` — illegal status change attempted (Inv. 1, 4)
 * - `OutcomeAlreadySet` — finalize attempted on already-finalized session (Inv. 5)
 * - `InvalidSignature` — signature does not verify against signedBy (Inv. 6)
 */
export const DomainError = {
  SessionAlreadyExists(sessionId: string) {
    return { SessionAlreadyExists: { sessionId } } as const;
  },
  SessionNotFound(sessionId: string) {
    return { SessionNotFound: { sessionId } } as const;
  },
  SessionAlreadyCompleted(sessionId: string) {
    return { SessionAlreadyCompleted: { sessionId } } as const;
  },
  SessionAlreadyDisputed(sessionId: string) {
    return { SessionAlreadyDisputed: { sessionId } } as const;
  },
  InvalidEventSequence(sessionId: string, expected: number, actual: number) {
    return { InvalidEventSequence: { sessionId, expected, actual } } as const;
  },
  UnauthorizedSigner(sessionId: string, signer: string) {
    return { UnauthorizedSigner: { sessionId, signer } } as const;
  },
  InvalidStatusTransition(sessionId: string, from: SessionStatus, to: SessionStatus) {
    return { InvalidStatusTransition: { sessionId, from, to } } as const;
  },
  OutcomeAlreadySet(sessionId: string) {
    return { OutcomeAlreadySet: { sessionId } } as const;
  },
  InvalidSignature(sessionId: string, eventId: string) {
    return { InvalidSignature: { sessionId, eventId } } as const;
  },
} as const;
export type DomainError = EnumValues<typeof DomainError>;
