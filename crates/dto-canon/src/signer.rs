//! secp256k1 ECDSA over keccak256, Ethereum-style.
//!
//! GalaChain's signature format (per ADR-0003 and observed empirically in
//! FEAT-004 G7 — see those test logs for a real signed DTO) is the
//! Ethereum convention: 65 bytes of `r || s || v` where `v ∈ {27, 28}`
//! (= 27 + recovery id). The hash function is keccak256 (not
//! sha3-256 — they have different padding).
//!
//! This module owns the **prehash** path: caller provides the canonical
//! bytes already (typically via [`crate::canonical::canonicalize_for_signing`]),
//! and we keccak it before signing. The bytes-vs-prehash split lets
//! [`crate::verifier::recover_public_key`] use the same hash without
//! re-canonicalizing.

use crate::error::DtoCanonError;
use k256::ecdsa::SigningKey;
use sha3::{Digest, Keccak256};

/// Length of a private key in bytes.
pub const PRIVATE_KEY_LEN: usize = 32;

/// Length of an Ethereum-style signature in bytes (`r || s || v`).
pub const SIGNATURE_LEN: usize = 65;

/// `v` byte offset for the Ethereum legacy encoding: `v = 27 + recid`.
pub(crate) const ETH_V_OFFSET: u8 = 27;

/// keccak256 of `bytes`, returned as a 32-byte array. Used as the prehash
/// for sign/verify and as the digest that builds the audit trail's
/// `prevHash` chain links.
pub fn keccak256(bytes: &[u8]) -> [u8; 32] {
    let mut hasher = Keccak256::new();
    hasher.update(bytes);
    hasher.finalize().into()
}

/// keccak256 of the canonical-serialized signing input. Hex-encoded with
/// the `0x` prefix used by the chaincode (so the Rust verifier's output
/// is directly comparable to a chaincode `prevHash`).
pub fn canonical_hash_hex(canonical_bytes: &[u8]) -> String {
    format!("0x{}", hex::encode(keccak256(canonical_bytes)))
}

/// Sign `message` (raw bytes — typically canonical JSON) with `private_key_hex`.
///
/// Returns the 130-char hex string `r || s || v` with `v = 27 + recid`.
pub fn sign(private_key_hex: &str, message: &[u8]) -> Result<String, DtoCanonError> {
    let priv_bytes = decode_private_key(private_key_hex)?;
    let signing_key = SigningKey::from_slice(&priv_bytes)?;
    let prehash = keccak256(message);

    let (signature, recovery_id) = signing_key.sign_prehash_recoverable(&prehash)?;
    let rs = signature.to_bytes();

    let mut out = [0u8; SIGNATURE_LEN];
    out[..64].copy_from_slice(&rs);
    out[64] = ETH_V_OFFSET + recovery_id.to_byte();
    Ok(hex::encode(out))
}

fn decode_private_key(hex_str: &str) -> Result<[u8; PRIVATE_KEY_LEN], DtoCanonError> {
    let stripped = hex_str.strip_prefix("0x").unwrap_or(hex_str);
    let bytes = hex::decode(stripped)?;
    bytes
        .as_slice()
        .try_into()
        .map_err(|_| DtoCanonError::InvalidLength {
            what: "private key",
            expected: PRIVATE_KEY_LEN,
            actual: bytes.len(),
        })
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;

    #[test]
    fn keccak256_matches_known_vector() {
        // keccak256("") known vector — different from sha3-256("").
        let h = keccak256(b"");
        assert_eq!(
            hex::encode(h),
            "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
        );
    }

    #[test]
    fn sign_outputs_65_bytes_with_eth_style_v() {
        // Deterministic test private key. Output length and v-byte shape
        // are what we assert; the actual signature is non-determ on
        // this k256 path (RFC 6979 deterministic k, so it IS deterministic
        // — that's fine).
        let priv_hex = "1111111111111111111111111111111111111111111111111111111111111111";
        let sig = sign(priv_hex, b"hello").unwrap();
        let bytes = hex::decode(&sig).unwrap();
        assert_eq!(bytes.len(), SIGNATURE_LEN);
        // v must be 27 or 28 (= 27 + recid where recid ∈ {0, 1}).
        let v = bytes[64];
        assert!(v == 27 || v == 28, "expected v ∈ {{27, 28}}, got {v}");
    }

    #[test]
    fn sign_is_deterministic_rfc_6979() {
        // k256 uses RFC 6979 deterministic k — signing the same message
        // with the same key must produce identical signatures across calls.
        // (This pins the property; if k256 ever switches default to a
        // randomized k, this test fails loudly.)
        let priv_hex = "1111111111111111111111111111111111111111111111111111111111111111";
        let a = sign(priv_hex, b"determinism check").unwrap();
        let b = sign(priv_hex, b"determinism check").unwrap();
        assert_eq!(a, b);
    }

    #[test]
    fn rejects_invalid_private_key_length() {
        let err = sign("aabb", b"x").unwrap_err();
        assert!(
            matches!(
                &err,
                DtoCanonError::InvalidLength {
                    what: "private key",
                    ..
                }
            ),
            "expected InvalidLength {{what: \"private key\"}}, got: {err:?}",
        );
    }
}
