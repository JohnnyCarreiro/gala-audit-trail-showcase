import type { EnumValues } from "@gala-audit-trail/result-helpers";

/**
 * `ClientError` — every failure surface the frontend exposes.
 *
 * Const-object-as-enum + `EnumValues<typeof ClientError>` per playbook.
 * Variants carry payloads so the UI can render specific messages
 * (e.g., a `LedgerWriteRejected` shows the chaincode's reason) without
 * stringifying through `Error.message`.
 */
export const ClientError = {
  /** User cancelled the wallet connect or signature prompt. */
  WalletCancelled() {
    return { WalletCancelled: {} } as const;
  },
  /** No wallet provider (MetaMask, etc.) detected in the browser. */
  WalletUnavailable() {
    return { WalletUnavailable: {} } as const;
  },
  /** Network or RPC error talking to the chaincode gateway. */
  ChainNetworkError(message: string) {
    return { ChainNetworkError: { message } } as const;
  },
  /** Chaincode returned a `GalaChainResponse.Error` payload. */
  ChainReturnedError(errorKey: string, message: string) {
    return { ChainReturnedError: { errorKey, message } } as const;
  },
  /** The session the user tried to view doesn't exist. */
  SessionNotFound(sessionId: string) {
    return { SessionNotFound: { sessionId } } as const;
  },
  /** Form / URL input failed validation before any chain call. */
  InvalidInput(field: string, reason: string) {
    return { InvalidInput: { field, reason } } as const;
  },
} as const;

export type ClientError = EnumValues<typeof ClientError>;
