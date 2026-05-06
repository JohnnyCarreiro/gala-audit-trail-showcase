import type { EnumValues } from "@gala-audit-trail/result-helpers";

/**
 * `InfraError` — failures from the ledger / SDK boundary.
 *
 * Distinct from `DomainError` (which is about business invariants): these
 * cover the technical failure modes of talking to Hyperledger Fabric via
 * `@gala-chain/chaincode`. Mapped to `ChainError` by
 * `infraErrorToChainError` in the contract layer (G5).
 */
export const InfraError = {
  /** Ledger I/O failed (network blip, wrong endorsement policy, etc.). */
  LedgerFailure(cause: string) {
    return { LedgerFailure: { cause } } as const;
  },
  /** Serialization or validation hiccup at the persistence boundary. */
  SerializationError(cause: string) {
    return { SerializationError: { cause } } as const;
  },
} as const;
export type InfraError = EnumValues<typeof InfraError>;
