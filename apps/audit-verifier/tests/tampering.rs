//! Integration tests for the audit-verifier — exercises the chain
//! verifier end-to-end against in-memory fixtures.
//!
//! Covers the FEAT-007 acceptance criteria for tampering detection:
//!   1. **Sequence gap** — `[1, 2, 4]` → reports MissingSequence.
//!   2. **Payload mutation** — alter a byte after signing → reports
//!      SignatureMismatch (the prevHash check would also catch this for
//!      a non-tail event; we deliberately tamper the tail to isolate
//!      the signature check).
//!   3. **Foreign signer** — sign event #2 with a different key but
//!      keep `signedBy` pointing at the original signer → reports
//!      SignatureMismatch.
//!
//! Plus a happy path that the verifier accepts a clean chain.
//!
//! Fixtures are built programmatically: each test generates real
//! secp256k1 keys, signs the canonical-for-signing input of each event
//! with the signer's private key, and assembles a `(session, events,
//! signers)` triple in memory. No file I/O — the verifier core is pure.

// Tests opt out of the workspace-wide unwrap/panic discipline — `unwrap()`
// + `panic!` on unexpected match arms are idiomatic in test code.
#![allow(clippy::unwrap_used, clippy::panic)]

use audit_verifier::{
    verify_chain, RawEvent, RawSession, SignerRegistry, TamperedReason, Verdict, GENESIS_HASH,
};
use dto_canon::{canonicalize_for_signing, keccak256, sign};
use k256::ecdsa::SigningKey;
use std::collections::HashMap;

// -- Builders ---------------------------------------------------------------

struct TestKey {
    private_hex: String,
    public_hex: String,
}

fn make_key(seed_byte: u8) -> TestKey {
    let private_hex = hex::encode([seed_byte; 32]);
    let priv_bytes = hex::decode(&private_hex).unwrap();
    let signing_key = SigningKey::from_slice(&priv_bytes).unwrap();
    let public_hex = hex::encode(
        signing_key
            .verifying_key()
            .to_encoded_point(false)
            .as_bytes(),
    );
    TestKey {
        private_hex,
        public_hex,
    }
}

fn make_session(studio: &str, players: Vec<&str>) -> RawSession {
    RawSession {
        session_id: "11111111-1111-4111-8111-111111111111".to_string(),
        game_id: "game-test".to_string(),
        players: players.into_iter().map(String::from).collect(),
        studio_signer: studio.to_string(),
        status: "COMPLETED".to_string(),
        created_at: "2026-05-12T00:00:00.000Z".to_string(),
        updated_at: "2026-05-12T00:00:10.000Z".to_string(),
        outcome_hash: Some(format!("0x{}", "a".repeat(64))),
        metadata: None,
    }
}

fn make_signer_registry(keys: &[(&str, &TestKey)]) -> SignerRegistry {
    let mut map = HashMap::new();
    for (identity, k) in keys {
        map.insert(identity.to_string(), k.public_hex.clone());
    }
    SignerRegistry { keys: map }
}

/// Build a signed event. `signing_key_hex` may differ from `signed_by` —
/// that's the "foreign signer" tampering case.
fn build_event(
    sequence: u64,
    payload: serde_json::Value,
    prev_hash: String,
    signed_by: &str,
    signing_key_hex: &str,
) -> RawEvent {
    // Build an unsigned skeleton, canonicalize-for-signing, sign that.
    let mut event = RawEvent {
        event_id: format!("00000000-0000-4000-8000-{:012x}", sequence),
        session_id: "11111111-1111-4111-8111-111111111111".to_string(),
        sequence,
        event_type: "CHECKPOINT".to_string(),
        payload,
        prev_hash,
        signed_by: signed_by.to_string(),
        signature: String::new(), // placeholder; stripped by canonicalize_for_signing
        timestamp: format!("2026-05-12T00:00:{:02}.000Z", sequence),
    };

    let value = serde_json::to_value(&event).unwrap();
    let canonical = canonicalize_for_signing(&value).unwrap();
    let sig = sign(signing_key_hex, &canonical).unwrap();
    event.signature = sig;
    event
}

fn link_to(event: &RawEvent) -> String {
    // Compute the next event's prevHash = keccak256(canonical(this event))
    // — full canonical (including signature), matching the chain logic.
    let value = serde_json::to_value(event).unwrap();
    let bytes = serde_json::to_vec(&value).unwrap();
    format!("0x{}", hex::encode(keccak256(&bytes)))
}

// -- Tests ------------------------------------------------------------------

#[test]
fn clean_chain_is_verified_valid() {
    let studio = make_key(1);
    let alice = make_key(2);
    let session = make_session("client|studio", vec!["client|alice"]);
    let signers = make_signer_registry(&[("client|studio", &studio), ("client|alice", &alice)]);

    let e1 = build_event(
        1,
        serde_json::json!({"score": 10}),
        GENESIS_HASH.to_string(),
        "client|alice",
        &alice.private_hex,
    );
    let e2 = build_event(
        2,
        serde_json::json!({"score": 20}),
        link_to(&e1),
        "client|alice",
        &alice.private_hex,
    );
    let e3 = build_event(
        3,
        serde_json::json!({"outcomeHash": format!("0x{}", "a".repeat(64))}),
        link_to(&e2),
        "client|studio",
        &studio.private_hex,
    );

    let verdict = verify_chain(&session, &[e1, e2, e3], &signers).unwrap();
    assert_eq!(verdict, Verdict::Valid { events_verified: 3 });
}

#[test]
fn sequence_gap_reports_missing_sequence_at_the_break() {
    let studio = make_key(11);
    let alice = make_key(12);
    let session = make_session("client|studio", vec!["client|alice"]);
    let signers = make_signer_registry(&[("client|studio", &studio), ("client|alice", &alice)]);

    // [1, 2, 4] — sequence 3 is missing.
    let e1 = build_event(
        1,
        serde_json::json!({}),
        GENESIS_HASH.into(),
        "client|alice",
        &alice.private_hex,
    );
    let e2 = build_event(
        2,
        serde_json::json!({}),
        link_to(&e1),
        "client|alice",
        &alice.private_hex,
    );
    let e4 = build_event(
        4,
        serde_json::json!({}),
        link_to(&e2),
        "client|alice",
        &alice.private_hex,
    );

    let verdict = verify_chain(&session, &[e1, e2, e4], &signers).unwrap();
    match verdict {
        Verdict::Tampered {
            events_verified,
            tampered_at,
            reason: TamperedReason::MissingSequence { expected, actual },
        } => {
            assert_eq!(events_verified, 2, "first two events should have verified");
            assert_eq!(tampered_at, 3);
            assert_eq!(expected, 3);
            assert_eq!(actual, 4);
        }
        other => panic!("expected MissingSequence verdict, got: {other:?}"),
    }
}

#[test]
fn payload_mutation_breaks_signature_check() {
    let studio = make_key(21);
    let alice = make_key(22);
    let session = make_session("client|studio", vec!["client|alice"]);
    let signers = make_signer_registry(&[("client|studio", &studio), ("client|alice", &alice)]);

    let e1 = build_event(
        1,
        serde_json::json!({"score": 10}),
        GENESIS_HASH.into(),
        "client|alice",
        &alice.private_hex,
    );
    // Build e2 cleanly, then mutate its payload after signing — the
    // signature no longer matches the canonical bytes.
    let mut e2 = build_event(
        2,
        serde_json::json!({"score": 20}),
        link_to(&e1),
        "client|alice",
        &alice.private_hex,
    );
    e2.payload = serde_json::json!({"score": 999_999}); // tampered

    let verdict = verify_chain(&session, &[e1, e2], &signers).unwrap();
    match verdict {
        Verdict::Tampered {
            events_verified,
            tampered_at,
            reason:
                TamperedReason::SignatureMismatch {
                    sequence,
                    signer,
                    detail,
                },
        } => {
            assert_eq!(events_verified, 1);
            assert_eq!(tampered_at, 2);
            assert_eq!(sequence, 2);
            assert_eq!(signer, "client|alice");
            assert!(
                detail.contains("recovered pubkey") || detail.contains("recover failed"),
                "detail should reference recovery/signature failure: {detail}",
            );
        }
        other => panic!("expected SignatureMismatch verdict, got: {other:?}"),
    }
}

#[test]
fn foreign_signer_recovers_different_key_and_is_rejected() {
    let studio = make_key(31);
    let alice = make_key(32);
    let attacker = make_key(99);
    let session = make_session("client|studio", vec!["client|alice"]);
    // attacker is NOT in players, but their key is registered — we want
    // the rejection to come from the SignatureMismatch (recovered key
    // differs from alice's registered key), not from UnauthorizedSigner.
    let signers = make_signer_registry(&[("client|studio", &studio), ("client|alice", &alice)]);

    let e1 = build_event(
        1,
        serde_json::json!({}),
        GENESIS_HASH.into(),
        "client|alice",
        &alice.private_hex,
    );
    // Event 2 *claims* to be from alice but is signed with attacker's key.
    let e2 = build_event(
        2,
        serde_json::json!({"score": 5}),
        link_to(&e1),
        "client|alice",
        &attacker.private_hex,
    );

    let verdict = verify_chain(&session, &[e1, e2], &signers).unwrap();
    match verdict {
        Verdict::Tampered {
            events_verified,
            tampered_at,
            reason:
                TamperedReason::SignatureMismatch {
                    sequence, signer, ..
                },
        } => {
            assert_eq!(events_verified, 1);
            assert_eq!(tampered_at, 2);
            assert_eq!(sequence, 2);
            assert_eq!(signer, "client|alice");
        }
        other => panic!("expected SignatureMismatch verdict, got: {other:?}"),
    }
}

#[test]
fn unauthorized_signer_is_caught_before_signature_check() {
    let studio = make_key(41);
    let alice = make_key(42);
    let outsider = make_key(43);
    let session = make_session("client|studio", vec!["client|alice"]);
    let signers = make_signer_registry(&[
        ("client|studio", &studio),
        ("client|alice", &alice),
        ("client|outsider", &outsider),
    ]);

    let e1 = build_event(
        1,
        serde_json::json!({}),
        GENESIS_HASH.into(),
        "client|alice",
        &alice.private_hex,
    );
    // Properly-signed event from outsider — but outsider isn't in the
    // session's player list, so the signer-authorization check trips
    // before the crypto signature check.
    let e2 = build_event(
        2,
        serde_json::json!({"score": 5}),
        link_to(&e1),
        "client|outsider",
        &outsider.private_hex,
    );

    let verdict = verify_chain(&session, &[e1, e2], &signers).unwrap();
    match verdict {
        Verdict::Tampered {
            tampered_at,
            reason: TamperedReason::UnauthorizedSigner { sequence, signer },
            ..
        } => {
            assert_eq!(tampered_at, 2);
            assert_eq!(sequence, 2);
            assert_eq!(signer, "client|outsider");
        }
        other => panic!("expected UnauthorizedSigner verdict, got: {other:?}"),
    }
}

#[test]
fn empty_event_list_returns_valid_zero() {
    let studio = make_key(51);
    let session = make_session("client|studio", vec!["client|alice"]);
    let signers = make_signer_registry(&[("client|studio", &studio)]);

    let verdict = verify_chain(&session, &[], &signers).unwrap();
    assert_eq!(verdict, Verdict::Valid { events_verified: 0 });
}
