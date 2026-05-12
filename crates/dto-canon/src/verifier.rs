//! secp256k1 ECDSA verification + public-key recovery over keccak256.
//!
//! Pairs with [`crate::signer`] — accepts the same `r || s || v`
//! Ethereum-style 65-byte hex signature it produces. Also accepts the
//! 64-byte `r || s` form for use cases where the recovery id is carried
//! separately (e.g., the DTO already contains `signerPublicKey` so
//! recovery isn't needed).

use crate::error::DtoCanonError;
use crate::signer::{keccak256, ETH_V_OFFSET, SIGNATURE_LEN};
use k256::ecdsa::{RecoveryId, Signature, VerifyingKey};

/// SEC1 uncompressed public-key length (`0x04 || x || y`).
pub const PUBLIC_KEY_UNCOMPRESSED_LEN: usize = 65;
/// SEC1 compressed public-key length (`0x02 | 0x03 || x`).
pub const PUBLIC_KEY_COMPRESSED_LEN: usize = 33;

/// Verify `signature_hex` against `message` and `expected_public_key_hex`.
///
/// Accepts both 64-byte (no v) and 65-byte (`r || s || v`) signatures —
/// the `v` byte is consumed but not strictly required for verification
/// when the public key is provided. Public key may be SEC1 compressed
/// (33 bytes) or uncompressed (65 bytes).
///
/// Returns `Ok(())` on success, [`DtoCanonError::InvalidSignature`] when
/// the signature is well-formed but doesn't validate.
pub fn verify(
    signature_hex: &str,
    message: &[u8],
    expected_public_key_hex: &str,
) -> Result<(), DtoCanonError> {
    let (signature, _recid) = decode_signature(signature_hex)?;
    let pub_bytes = decode_public_key(expected_public_key_hex)?;
    let verifying_key = VerifyingKey::from_sec1_bytes(&pub_bytes)?;
    let prehash = keccak256(message);

    use k256::ecdsa::signature::hazmat::PrehashVerifier;
    verifying_key
        .verify_prehash(&prehash, &signature)
        .map_err(|_| DtoCanonError::InvalidSignature)
}

/// Recover the signer's SEC1 uncompressed public key (`0x04 || x || y`,
/// 65 bytes, hex-encoded) from a 65-byte recoverable signature and the
/// canonical message bytes. Requires the `v` byte — a 64-byte signature
/// is rejected with [`DtoCanonError::InvalidLength`].
pub fn recover_public_key(signature_hex: &str, message: &[u8]) -> Result<String, DtoCanonError> {
    let (signature, recid_opt) = decode_signature(signature_hex)?;
    let recid = recid_opt.ok_or(DtoCanonError::InvalidLength {
        what: "signature (recovery)",
        expected: SIGNATURE_LEN,
        actual: 64,
    })?;
    let prehash = keccak256(message);
    let key = VerifyingKey::recover_from_prehash(&prehash, &signature, recid)?;
    let encoded = key.to_encoded_point(false); // uncompressed
    Ok(hex::encode(encoded.as_bytes()))
}

// -- Decoding helpers --------------------------------------------------------

fn decode_signature(hex_str: &str) -> Result<(Signature, Option<RecoveryId>), DtoCanonError> {
    let stripped = hex_str.strip_prefix("0x").unwrap_or(hex_str);
    let bytes = hex::decode(stripped)?;
    match bytes.len() {
        64 => {
            let sig = Signature::from_slice(&bytes)?;
            Ok((sig, None))
        }
        SIGNATURE_LEN => {
            let sig = Signature::from_slice(&bytes[..64])?;
            let recid = parse_recovery_byte(bytes[64])?;
            Ok((sig, Some(recid)))
        }
        actual => Err(DtoCanonError::InvalidLength {
            what: "signature",
            expected: SIGNATURE_LEN,
            actual,
        }),
    }
}

fn parse_recovery_byte(v: u8) -> Result<RecoveryId, DtoCanonError> {
    // Accept both raw recid (0, 1) and Ethereum-legacy form (27, 28).
    // EIP-155 chain-id forms (≥ 35) aren't used by GalaChain — reject.
    let recid_byte = match v {
        0 | 1 => v,
        27 | 28 => v - ETH_V_OFFSET,
        _ => return Err(DtoCanonError::InvalidRecoveryId(v)),
    };
    RecoveryId::from_byte(recid_byte).ok_or(DtoCanonError::InvalidRecoveryId(v))
}

fn decode_public_key(hex_str: &str) -> Result<Vec<u8>, DtoCanonError> {
    let stripped = hex_str.strip_prefix("0x").unwrap_or(hex_str);
    let bytes = hex::decode(stripped)?;
    match bytes.len() {
        PUBLIC_KEY_COMPRESSED_LEN | PUBLIC_KEY_UNCOMPRESSED_LEN => Ok(bytes),
        actual => Err(DtoCanonError::InvalidLength {
            what: "public key",
            expected: PUBLIC_KEY_UNCOMPRESSED_LEN,
            actual,
        }),
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;
    use crate::signer::sign;
    use k256::ecdsa::SigningKey;

    fn known_pubkey_hex(priv_hex: &str) -> String {
        let bytes = hex::decode(priv_hex).unwrap();
        let signing_key = SigningKey::from_slice(&bytes).unwrap();
        hex::encode(
            signing_key
                .verifying_key()
                .to_encoded_point(false)
                .as_bytes(),
        )
    }

    #[test]
    fn verify_accepts_signature_from_signer_module() {
        let priv_hex = "2222222222222222222222222222222222222222222222222222222222222222";
        let pub_hex = known_pubkey_hex(priv_hex);
        let msg = b"verify round trip";

        let sig = sign(priv_hex, msg).unwrap();
        verify(&sig, msg, &pub_hex).unwrap();
    }

    #[test]
    fn verify_rejects_signature_under_wrong_message() {
        let priv_hex = "3333333333333333333333333333333333333333333333333333333333333333";
        let pub_hex = known_pubkey_hex(priv_hex);
        let sig = sign(priv_hex, b"original message").unwrap();

        let err = verify(&sig, b"tampered message", &pub_hex).unwrap_err();
        assert!(matches!(err, DtoCanonError::InvalidSignature));
    }

    #[test]
    fn verify_rejects_signature_under_wrong_key() {
        let priv_a = "4444444444444444444444444444444444444444444444444444444444444444";
        let priv_b = "5555555555555555555555555555555555555555555555555555555555555555";
        let pub_b = known_pubkey_hex(priv_b);
        let sig_a = sign(priv_a, b"hello").unwrap();

        let err = verify(&sig_a, b"hello", &pub_b).unwrap_err();
        assert!(matches!(err, DtoCanonError::InvalidSignature));
    }

    #[test]
    fn recover_returns_signer_public_key() {
        let priv_hex = "6666666666666666666666666666666666666666666666666666666666666666";
        let expected_pub = known_pubkey_hex(priv_hex);

        let sig = sign(priv_hex, b"recover me").unwrap();
        let recovered = recover_public_key(&sig, b"recover me").unwrap();
        assert_eq!(recovered, expected_pub);
    }

    #[test]
    fn recover_fails_on_64_byte_signature() {
        // 64 bytes = no v byte → can't pick the right curve point.
        let no_v = "a".repeat(128);
        let err = recover_public_key(&no_v, b"x").unwrap_err();
        assert!(matches!(
            err,
            DtoCanonError::InvalidLength {
                what: "signature (recovery)",
                ..
            }
        ));
    }

    #[test]
    fn accepts_legacy_eth_v_bytes_27_and_28() {
        // Build sig manually with v=27/28 to make sure parse_recovery_byte
        // handles both the raw and the Ethereum-offset forms.
        let priv_hex = "7777777777777777777777777777777777777777777777777777777777777777";
        let sig = sign(priv_hex, b"x").unwrap();
        let mut bytes = hex::decode(&sig).unwrap();
        // Force v = 27. If recid was 0, this is the same; if it was 1,
        // recovery will recover the wrong key but parsing must succeed.
        bytes[64] = 27;
        let _ = recover_public_key(&hex::encode(&bytes), b"x").unwrap();

        bytes[64] = 28;
        let _ = recover_public_key(&hex::encode(&bytes), b"x").unwrap();
    }

    #[test]
    fn rejects_unrecognized_v_byte() {
        let priv_hex = "8888888888888888888888888888888888888888888888888888888888888888";
        let sig = sign(priv_hex, b"x").unwrap();
        let mut bytes = hex::decode(&sig).unwrap();
        bytes[64] = 99;
        let err = recover_public_key(&hex::encode(&bytes), b"x").unwrap_err();
        assert!(matches!(err, DtoCanonError::InvalidRecoveryId(99)));
    }
}
