import { keccak_256 } from "js-sha3";
import stringify from "json-stringify-deterministic";

/**
 * Genesis hash — 32 zero bytes. Used as `prevHash` of the first SessionEvent
 * in a session (sequence === 1). Anchors the chain.
 */
export const GENESIS_HASH: string = `0x${"00".repeat(32)}`;

/**
 * Canonical JSON serialization — keys sorted alphabetically (recursively,
 * via `json-stringify-deterministic`), no whitespace. Same lib that
 * `@gala-chain/api`'s `serialize()` uses internally, so byte output matches
 * what the SDK will sign.
 *
 * The Rust verifier (FEAT-006) reproduces this byte-for-byte using
 * `serde_json` with sorted keys.
 */
export function canonicalSerialize(value: unknown): string {
  return stringify(value);
}

/**
 * keccak256 of canonical(value), prefixed with `0x` (Ethereum convention).
 * Length is always 66 chars (`0x` + 64 hex).
 */
export function canonicalHashHex(value: unknown): string {
  return `0x${keccak_256(canonicalSerialize(value))}`;
}
