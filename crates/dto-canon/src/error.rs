//! Error enum for the `dto-canon` crate.
//!
//! Per the playbook: one `thiserror` enum per module. Variants are
//! caller-facing — `Display` text is meant to be surfaced as the human
//! reason a verification step failed.

use thiserror::Error;

/// All ways a canonical-serialization / sign / verify operation can fail.
#[derive(Debug, Error)]
pub enum DtoCanonError {
    /// `serde_json` rejected the value (e.g., trailing data) or could not
    /// serialize it (`f64::NAN`, `f64::INFINITY`).
    #[error("canonical serialization failed: {0}")]
    Serialize(#[from] serde_json::Error),

    /// A hex-encoded input (private key, public key, signature) was not
    /// valid hex.
    #[error("invalid hex input: {0}")]
    InvalidHex(#[from] hex::FromHexError),

    /// A byte slice had the wrong length for its expected role (private
    /// key: 32 bytes; signature: 64 or 65 bytes; public key SEC1
    /// uncompressed: 65 bytes; compressed: 33 bytes).
    #[error("invalid length for {what}: expected {expected}, got {actual}")]
    InvalidLength {
        what: &'static str,
        expected: usize,
        actual: usize,
    },

    /// The `v` byte of a 65-byte signature wasn't a recognized recovery
    /// id. Accepts `0`, `1`, `27`, `28` (and `2`, `3`, `29`, `30` for
    /// chain-id-2 forks, though we don't use them).
    #[error("invalid recovery id v={0:#x}")]
    InvalidRecoveryId(u8),

    /// The signature is well-formed but not valid for the given key over
    /// the given hash.
    #[error("signature verification failed")]
    InvalidSignature,

    /// A k256 ECDSA operation failed for a reason other than the above
    /// (e.g., point-at-infinity from a tampered signature).
    #[error("ecdsa error: {0}")]
    Ecdsa(String),
}

impl From<k256::ecdsa::Error> for DtoCanonError {
    fn from(err: k256::ecdsa::Error) -> Self {
        Self::Ecdsa(err.to_string())
    }
}
