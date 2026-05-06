//! `dto-signer` — thin CLI demoing `dto-canon` reusability.
//!
//! Reads `{ "dto": ..., "private_key_hex": "..." }` from stdin,
//! emits `{ "canonical_hex", "signature_hex", "signer_pubkey" }`.
//!
//! See `docs/sdds/sdd-off-chain-verifier.md`. Bonus deliverable; FEAT-008.
//! Stub — implementation lands once `dto-canon` is real (post-FEAT-006).

fn main() {
    println!("dto-signer — stub. See FEAT-008 for the real implementation.");
}
