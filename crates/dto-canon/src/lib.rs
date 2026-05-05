//! `dto-canon` — canonical DTO serialization + secp256k1/keccak256 sign/verify primitives.
//!
//! Reproduces GalaChain's signing scheme byte-for-byte so an off-chain verifier
//! can validate audit-trail events without trusting the chaincode itself.
//!
//! See `docs/sdds/sdd-off-chain-verifier.md`.
//!
//! Stub crate — FEAT-006 fills in `canonical`, `signer`, `verifier`, `error`.
