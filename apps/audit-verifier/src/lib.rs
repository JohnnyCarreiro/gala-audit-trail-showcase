//! `audit-verifier` — off-chain verifier library + CLI.
//!
//! Re-checks the audit-trail hash chain and cryptographic signatures
//! independently of the chaincode. See ADR-0007 and SDD-002.
//!
//! Library exposes the verifier primitives so integration tests (and
//! potentially other binaries) can drive the verifier without going
//! through the CLI shell. `main.rs` is the only place that aggregates
//! these into a runnable command and uses `anyhow`.

pub mod chain;
pub mod error;
pub mod event;
pub mod proof;
pub mod source;

pub use chain::{verify_chain, TamperedReason, Verdict, GENESIS_HASH};
pub use error::{ChainError, StreamError};
pub use event::{RawEvent, RawSession, SignerRegistry};
pub use proof::{ProofReport, VerifierInfo};
pub use source::{EventSource, FileEventSource};
