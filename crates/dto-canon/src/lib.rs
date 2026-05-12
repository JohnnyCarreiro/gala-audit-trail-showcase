//! `dto-canon` — canonical DTO serialization + secp256k1/keccak256 sign/verify
//! primitives.
//!
//! Reproduces GalaChain's signing scheme byte-for-byte so an off-chain
//! verifier ([`apps/audit-verifier`], FEAT-007) can validate audit-trail
//! events without trusting the chaincode itself. Pure library — no I/O,
//! no `unsafe`, `unwrap_used` denied in production code.
//!
//! # Layout
//!
//! - [`canonical`] — JSON canonicalization (alphabetical keys, no
//!   whitespace) + signing-input field stripping.
//! - [`signer`] — keccak256 + ECDSA sign (Ethereum `r || s || v`).
//! - [`verifier`] — verify + public-key recovery.
//! - [`error`] — single `thiserror` enum [`DtoCanonError`].
//!
//! # See also
//!
//! - [`docs/sdds/sdd-off-chain-verifier.md`] — SDD-002.
//! - [`docs/adrs/0007-off-chain-verification-strategy.md`] — ADR-0007.
//!
//! [`apps/audit-verifier`]: ../audit_verifier/index.html

pub mod canonical;
pub mod error;
pub mod signer;
pub mod verifier;

pub use canonical::{canonicalize, canonicalize_for_signing, SIGNING_STRIPPED_FIELDS};
pub use error::DtoCanonError;
pub use signer::{canonical_hash_hex, keccak256, sign, PRIVATE_KEY_LEN, SIGNATURE_LEN};
pub use verifier::{
    recover_public_key, verify, PUBLIC_KEY_COMPRESSED_LEN, PUBLIC_KEY_UNCOMPRESSED_LEN,
};
