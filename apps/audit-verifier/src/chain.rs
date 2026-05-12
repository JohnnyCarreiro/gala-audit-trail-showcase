//! Hash-chain + signature verifier. **Pure** — no I/O, takes a session,
//! an ordered (or unordered) list of events, and a signer registry,
//! and returns a [`Verdict`].
//!
//! # Mirrors and extends the on-chain verifier
//!
//! The on-chain `verifyIntegrity` (FEAT-003 `verify-integrity.ts`)
//! checks sequence monotonicity, prevHash chain, and signer
//! authorization. This off-chain verifier does **the same checks** —
//! and additionally cryptographically validates each event's signature
//! against the registered public key for its `signedBy` identity. The
//! on-chain version skipped the crypto check because the SDK already
//! validated the DTO's signature at write time.
//!
//! # Signing input convention
//!
//! Each event's `signature` field is verified over
//! `canonicalize_for_signing(event)` — that is, the canonical JSON of the
//! event minus its own `signature` (and any `trace` field). This matches
//! [`dto_canon::canonicalize_for_signing`] so the same primitive is used
//! on both sides of the boundary.

use crate::error::ChainError;
use crate::event::{RawEvent, RawSession, SignerRegistry};
use dto_canon::{canonicalize_for_signing, keccak256, recover_public_key};
use serde::{Deserialize, Serialize};

/// 32 zero bytes — anchor of the hash chain, used as `prevHash` of the
/// first event in a session.
pub const GENESIS_HASH: &str = "0x0000000000000000000000000000000000000000000000000000000000000000";

/// Verdict of a chain verification. Mirrors `IntegrityVerdict` from the
/// chaincode domain, with a [`Verdict::Tampered`] reason set that adds
/// `SignatureMismatch` (the off-chain-only check).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Verdict {
    /// Every event passed every check.
    Valid {
        #[serde(rename = "eventsVerified")]
        events_verified: usize,
    },
    /// Verification stopped at the first inconsistency.
    Tampered {
        #[serde(rename = "eventsVerified")]
        events_verified: usize,
        #[serde(rename = "tamperedAt")]
        tampered_at: u64,
        reason: TamperedReason,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum TamperedReason {
    MissingSequence {
        expected: u64,
        actual: u64,
    },
    PrevHashMismatch {
        sequence: u64,
        expected: String,
        actual: String,
    },
    UnauthorizedSigner {
        sequence: u64,
        signer: String,
    },
    SignatureMismatch {
        sequence: u64,
        signer: String,
        detail: String,
    },
}

/// Run the full verification: returns [`Verdict::Valid`] iff every event
/// passes every check, otherwise stops at the first inconsistency and
/// returns [`Verdict::Tampered`] with the specific reason.
///
/// Returns [`ChainError`] only when an input is structurally invalid
/// (malformed hex). Tampering is *the answer*, not a failure.
pub fn verify_chain(
    session: &RawSession,
    events: &[RawEvent],
    signers: &SignerRegistry,
) -> Result<Verdict, ChainError> {
    // Sort by sequence — a sane source returns ordered events, but
    // composite-key range scans on Fabric don't always guarantee strict
    // numeric order (`"10"` < `"2"` lexicographically). Defensive.
    let mut ordered: Vec<&RawEvent> = events.iter().collect();
    ordered.sort_by_key(|e| e.sequence);

    if ordered.is_empty() {
        // A session with no events is trivially internally consistent —
        // the chain has zero links to verify. Matches on-chain semantics.
        return Ok(Verdict::Valid { events_verified: 0 });
    }

    let authorized: Vec<&str> = session.authorized_signers();

    for (i, event) in ordered.iter().enumerate() {
        let expected_sequence = (i as u64) + 1;

        // Inv. 2 — sequence monotonicity, no gaps.
        if event.sequence != expected_sequence {
            return Ok(Verdict::Tampered {
                events_verified: i,
                tampered_at: expected_sequence,
                reason: TamperedReason::MissingSequence {
                    expected: expected_sequence,
                    actual: event.sequence,
                },
            });
        }

        // Inv. 6 — prevHash chain link.
        let expected_prev = if i == 0 {
            GENESIS_HASH.to_string()
        } else {
            canonical_event_hash(ordered[i - 1])?
        };
        if event.prev_hash != expected_prev {
            return Ok(Verdict::Tampered {
                events_verified: i,
                tampered_at: event.sequence,
                reason: TamperedReason::PrevHashMismatch {
                    sequence: event.sequence,
                    expected: expected_prev,
                    actual: event.prev_hash.clone(),
                },
            });
        }

        // Inv. 3 — signer authorization (logically same as on-chain check).
        if !authorized.iter().any(|s| s == &event.signed_by.as_str()) {
            return Ok(Verdict::Tampered {
                events_verified: i,
                tampered_at: event.sequence,
                reason: TamperedReason::UnauthorizedSigner {
                    sequence: event.sequence,
                    signer: event.signed_by.clone(),
                },
            });
        }

        // Off-chain extra — verify the signature against the registered
        // public key for this `signedBy`.
        if let Some(mismatch) = check_signature(event, signers)? {
            return Ok(Verdict::Tampered {
                events_verified: i,
                tampered_at: event.sequence,
                reason: mismatch,
            });
        }
    }

    Ok(Verdict::Valid {
        events_verified: ordered.len(),
    })
}

/// keccak256(canonical(event)) as `0x` + 64 hex chars. Used to recompute
/// the next event's expected `prevHash`. Includes the `signature` field
/// — i.e., the *full* event, since that's what gets persisted on-chain
/// and what the chain references in the next link.
fn canonical_event_hash(event: &RawEvent) -> Result<String, ChainError> {
    let value = serde_json::to_value(event).map_err(ChainError::Serialize)?;
    // For the chain link we hash the *full* canonical event (including
    // signature) — that's what `apps/chaincode/src/domain/canonical.ts`
    // does via `canonicalHashHex` on the persisted event.
    let bytes = serde_json::to_vec(&value).map_err(ChainError::Serialize)?;
    Ok(format!("0x{}", hex::encode(keccak256(&bytes))))
}

/// Verify `event.signature` against the registered pubkey for
/// `event.signedBy`. Returns:
///
/// - `Ok(None)` — signature is valid for the expected signer.
/// - `Ok(Some(reason))` — well-formed signature that doesn't validate
///   (no registered key, or recovers a different key, or signature
///   format is parseable but math fails).
/// - `Err(ChainError)` — input is structurally broken (bad hex on a
///   load-bearing field), distinct from "valid input that fails to verify".
fn check_signature(
    event: &RawEvent,
    signers: &SignerRegistry,
) -> Result<Option<TamperedReason>, ChainError> {
    let Some(expected_pub) = signers.lookup(&event.signed_by) else {
        return Ok(Some(TamperedReason::SignatureMismatch {
            sequence: event.sequence,
            signer: event.signed_by.clone(),
            detail: "no public key registered for this signer".to_string(),
        }));
    };

    let value = serde_json::to_value(event).map_err(ChainError::Serialize)?;
    let canonical = canonicalize_for_signing(&value)?;

    let recovered = match recover_public_key(&event.signature, &canonical) {
        Ok(pk) => pk,
        Err(err) => {
            return Ok(Some(TamperedReason::SignatureMismatch {
                sequence: event.sequence,
                signer: event.signed_by.clone(),
                detail: format!("recover failed: {err}"),
            }));
        }
    };

    // Normalize both to lowercase hex without `0x` prefix for comparison —
    // pubkey hex is case-insensitive but compositionally distinct otherwise.
    let normalize = |s: &str| s.trim_start_matches("0x").to_ascii_lowercase();
    if normalize(&recovered) != normalize(expected_pub) {
        return Ok(Some(TamperedReason::SignatureMismatch {
            sequence: event.sequence,
            signer: event.signed_by.clone(),
            detail: "recovered pubkey does not match registered key for signer".to_string(),
        }));
    }
    Ok(None)
}
