//! Integration tests for `dto-canon`.
//!
//! Covers the FEAT-006 acceptance criteria:
//!   - Round-trip canonical: `serialize(parse(bytes)) == bytes` for ≥ 5
//!     fixtures spanning JSON shapes the audit-trail layer actually uses.
//!   - Sign + verify with a known private key.
//!   - Invalid signature rejected.
//!   - Public key recovery matches the signer.
//!
//! Notes:
//!   - The strongest cross-language equivalence test is a golden vector
//!     captured from a real `@gala-chain/api` signing call (OQ-02). That
//!     belongs in FEAT-007 integration where we have a deployed chaincode
//!     to talk to. Here we pin the *Rust-side* invariants and let the
//!     verifier crate own the cross-impl golden.

#![allow(clippy::unwrap_used)]

use dto_canon::{
    canonical_hash_hex, canonicalize, canonicalize_for_signing, keccak256, recover_public_key,
    sign, verify, DtoCanonError,
};
use k256::ecdsa::SigningKey;
use serde_json::{json, Value};

// -- Helpers -----------------------------------------------------------------

fn pubkey_for(priv_hex: &str) -> String {
    let bytes = hex::decode(priv_hex).unwrap();
    let signing_key = SigningKey::from_slice(&bytes).unwrap();
    hex::encode(
        signing_key
            .verifying_key()
            .to_encoded_point(false)
            .as_bytes(),
    )
}

fn assert_canonical_round_trip(value: Value) {
    let bytes = canonicalize(&value).unwrap();
    let reparsed: Value = serde_json::from_slice(&bytes).unwrap();
    let bytes_again = canonicalize(&reparsed).unwrap();
    assert_eq!(
        bytes,
        bytes_again,
        "round-trip mismatch:\n  first:  {}\n  second: {}",
        String::from_utf8_lossy(&bytes),
        String::from_utf8_lossy(&bytes_again),
    );
}

// -- Round-trip fixtures (≥ 5, per FEAT-006) --------------------------------

#[test]
fn round_trip_flat_object_with_mixed_value_types() {
    assert_canonical_round_trip(json!({
        "sessionId": "00000000-0000-4000-8000-000000000001",
        "sequence": 42,
        "active": true,
        "outcomeHash": null,
    }));
}

#[test]
fn round_trip_nested_objects_with_unsorted_keys() {
    assert_canonical_round_trip(json!({
        "z_top": {
            "z_inner": 1,
            "a_inner": "deep value",
            "m_inner": [3, 1, 2],
        },
        "a_top": "first",
        "m_top": {"only": "child"},
    }));
}

#[test]
fn round_trip_array_of_event_like_objects() {
    // Models a slice of the SessionEvent stream — order-sensitive!
    assert_canonical_round_trip(json!([
        {"sequence": 1, "payload": {"score": 10}, "signedBy": "client|alice"},
        {"sequence": 2, "payload": {"score": 25}, "signedBy": "client|bob"},
        {"sequence": 3, "payload": {"score": 99}, "signedBy": "client|studio"},
    ]));
}

#[test]
fn round_trip_event_with_realistic_chain_shape() {
    // Shape mirrors `SessionEvent` from FEAT-003 — the actual canonical
    // input used to compute `prevHash` for the chain link.
    assert_canonical_round_trip(json!({
        "eventId": "00000000-0000-4000-8000-000000000a01",
        "sessionId": "00000000-0000-4000-8000-000000000001",
        "sequence": 1,
        "eventType": "CHECKPOINT",
        "payload": {"level": 7, "items": ["sword", "shield"]},
        "prevHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "signedBy": "client|alice",
        "signature": "0xdead",
        "timestamp": "2026-05-12T00:00:00.000Z",
    }));
}

#[test]
fn round_trip_unicode_strings_are_stable() {
    // UTF-8 strings round-trip identically — escape rules are
    // deterministic in both serde_json and json-stringify-deterministic
    // for the ASCII subset and for common Unicode points like these.
    assert_canonical_round_trip(json!({
        "studio_name": "Galá Game Studio",
        "tag_pt": "português",
        "emoji_marker": "checkpoint→✓",
    }));
}

#[test]
fn round_trip_deeply_nested_payload() {
    assert_canonical_round_trip(json!({
        "metadata": {
            "deep": {
                "deeper": {
                    "deepest": {
                        "k_z": 0,
                        "k_a": null,
                        "k_m": [1, {"inside_array": "yes"}, null, true],
                    }
                }
            }
        }
    }));
}

// -- Canonical shape pins ---------------------------------------------------

#[test]
fn canonical_strips_signature_and_trace_for_signing_only() {
    let with_sig = json!({
        "sessionId": "abc",
        "payload": {"x": 1},
        "signature": "should-disappear",
        "trace": {"requestId": "should-also-disappear"},
    });
    let plain = canonicalize(&with_sig).unwrap();
    let stripped = canonicalize_for_signing(&with_sig).unwrap();

    let plain_s = std::str::from_utf8(&plain).unwrap();
    let stripped_s = std::str::from_utf8(&stripped).unwrap();
    assert!(plain_s.contains("should-disappear"));
    assert!(plain_s.contains("should-also-disappear"));
    assert!(!stripped_s.contains("should-disappear"));
    assert!(!stripped_s.contains("should-also-disappear"));
    assert!(stripped_s.contains("\"sessionId\":\"abc\""));
}

#[test]
fn canonical_hash_hex_format_matches_chaincode() {
    // Format pin only — the on-chain `canonicalHashHex()` returns
    // `0x` + 64 hex chars. If we ever switch hash algorithms, this
    // catches the format break.
    let h = canonical_hash_hex(b"any bytes here");
    assert!(h.starts_with("0x"));
    assert_eq!(h.len(), 66);
    assert!(h[2..].chars().all(|c| c.is_ascii_hexdigit()));
}

#[test]
fn keccak256_genesis_input_is_known_vector() {
    // keccak256("") — the most basic cross-impl pin. Distinct from
    // sha3-256("") which has different padding.
    let h = hex::encode(keccak256(b""));
    assert_eq!(
        h,
        "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
    );
}

// -- Sign / verify / recover triangle ---------------------------------------

const TEST_PRIV: &str = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

#[test]
fn sign_then_verify_succeeds_with_matching_pubkey() {
    let msg = canonicalize(&json!({"hello": "world", "n": 42})).unwrap();
    let sig = sign(TEST_PRIV, &msg).unwrap();
    verify(&sig, &msg, &pubkey_for(TEST_PRIV)).unwrap();
}

#[test]
fn verify_rejects_tampered_message() {
    let msg_a = canonicalize(&json!({"order": 1})).unwrap();
    let msg_b = canonicalize(&json!({"order": 2})).unwrap();
    let sig = sign(TEST_PRIV, &msg_a).unwrap();

    let err = verify(&sig, &msg_b, &pubkey_for(TEST_PRIV)).unwrap_err();
    assert!(matches!(err, DtoCanonError::InvalidSignature));
}

#[test]
fn verify_rejects_signature_under_a_different_key() {
    let priv_a = "1111111111111111111111111111111111111111111111111111111111111111";
    let priv_b = "2222222222222222222222222222222222222222222222222222222222222222";
    let msg = canonicalize(&json!({"who": "alice"})).unwrap();
    let sig_a = sign(priv_a, &msg).unwrap();

    let err = verify(&sig_a, &msg, &pubkey_for(priv_b)).unwrap_err();
    assert!(matches!(err, DtoCanonError::InvalidSignature));
}

#[test]
fn recover_returns_signer_pubkey_for_real_event_shape() {
    let event = json!({
        "eventId": "00000000-0000-4000-8000-000000000a01",
        "sessionId": "00000000-0000-4000-8000-000000000001",
        "sequence": 1,
        "eventType": "CHECKPOINT",
        "payload": {"score": 10},
        "prevHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "signedBy": "client|alice",
        "timestamp": "2026-05-12T00:00:00.000Z",
    });
    // Sign over the canonical-for-signing bytes (strips any signature
    // field if it'd been embedded) — mirrors what the chaincode does.
    let msg = canonicalize_for_signing(&event).unwrap();
    let sig = sign(TEST_PRIV, &msg).unwrap();

    let recovered = recover_public_key(&sig, &msg).unwrap();
    assert_eq!(recovered, pubkey_for(TEST_PRIV));
}

#[test]
fn malformed_signature_hex_is_rejected_at_decode_time() {
    let msg = b"x";
    let pub_hex = pubkey_for(TEST_PRIV);

    // Wrong length.
    let err = verify("aabbcc", msg, &pub_hex).unwrap_err();
    assert!(matches!(
        err,
        DtoCanonError::InvalidLength {
            what: "signature",
            ..
        }
    ));

    // Non-hex chars.
    let err = verify("zz".repeat(65).as_str(), msg, &pub_hex).unwrap_err();
    assert!(matches!(err, DtoCanonError::InvalidHex(_)));
}
