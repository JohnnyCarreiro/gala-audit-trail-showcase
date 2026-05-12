//! `thiserror` enums per module. Per the playbook: no `anyhow` outside
//! `main.rs` — the binary entry point aggregates these errors via `?` and
//! converts to `anyhow::Error` at the boundary with the OS.

use thiserror::Error;

/// All ways an event source can fail to materialize the data the chain
/// verifier needs. `FileEventSource` produces I/O variants; the future
/// HTTP source (see [`OQ-03`]) would add networking ones.
///
/// [`OQ-03`]: ../../../../docs/open-questions.md
#[derive(Debug, Error)]
pub enum StreamError {
    /// Required file (`session.json`, `events.json`, or `signers.json`)
    /// was not found at the source root.
    #[error("source file missing: {0}")]
    SourceFileMissing(String),

    /// I/O error reading from the source.
    #[error("source io error: {0}")]
    Io(#[from] std::io::Error),

    /// The source returned data that didn't deserialize into the
    /// expected shape (session / events / signer registry).
    #[error("source deserialize error: {0}")]
    Deserialize(#[from] serde_json::Error),

    /// The fetched session id didn't match the one requested. Defends
    /// against a misconfigured source that returns the wrong session.
    #[error("session id mismatch: requested {requested}, got {actual}")]
    SessionMismatch { requested: String, actual: String },
}

/// Errors from the chain verifier proper — distinct from `Verdict::Tampered`
/// (which is *the answer*, not a failure). These are inputs-are-malformed
/// kind of errors (e.g., a hex field that isn't valid hex).
#[derive(Debug, Error)]
pub enum ChainError {
    /// An event field that should be hex (`prevHash`, `signature`) wasn't.
    #[error("invalid hex in event {sequence}.{field}: {source}")]
    InvalidEventHex {
        sequence: u64,
        field: &'static str,
        #[source]
        source: hex::FromHexError,
    },

    /// `dto-canon` couldn't canonicalize or sign-verify the event.
    #[error("crypto primitive failed: {0}")]
    Crypto(#[from] dto_canon::DtoCanonError),

    /// JSON for the event couldn't be re-derived from its struct
    /// (shouldn't happen unless the event contains values serde_json
    /// can't represent — e.g., a `f64::NAN` in payload).
    #[error("event serialization failed: {0}")]
    Serialize(serde_json::Error),
}
