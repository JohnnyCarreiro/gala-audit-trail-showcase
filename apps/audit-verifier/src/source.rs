//! Event source abstraction. The chain verifier is generic over how it
//! gets its data — today we ship a file-backed source (which is also
//! how the integration tests drive the verifier); the HTTP source
//! against the TNT gateway is deferred behind [`OQ-03`].
//!
//! [`OQ-03`]: ../../../../docs/open-questions.md

use crate::error::StreamError;
use crate::event::{RawEvent, RawSession, SignerRegistry};
use std::path::{Path, PathBuf};

/// Anything that can supply the inputs the verifier needs for a session.
pub trait EventSource {
    fn fetch_session(&self, session_id: &str) -> Result<RawSession, StreamError>;
    fn fetch_events(&self, session_id: &str) -> Result<Vec<RawEvent>, StreamError>;
    fn fetch_signers(&self, session_id: &str) -> Result<SignerRegistry, StreamError>;
}

/// Reads `session.json`, `events.json`, and `signers.json` from a
/// directory. Useful for testing (fixtures live on disk) and for
/// validating a session whose data was captured out-of-band — e.g.,
/// dumped from a chaincode run and shared with a customer.
pub struct FileEventSource {
    root: PathBuf,
}

impl FileEventSource {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }

    fn read_json<T: serde::de::DeserializeOwned>(&self, file_name: &str) -> Result<T, StreamError> {
        let path = self.root.join(file_name);
        if !path.exists() {
            return Err(StreamError::SourceFileMissing(path.display().to_string()));
        }
        let bytes = std::fs::read(&path)?;
        Ok(serde_json::from_slice(&bytes)?)
    }
}

impl EventSource for FileEventSource {
    fn fetch_session(&self, session_id: &str) -> Result<RawSession, StreamError> {
        let session: RawSession = self.read_json("session.json")?;
        if session.session_id != session_id {
            return Err(StreamError::SessionMismatch {
                requested: session_id.to_string(),
                actual: session.session_id,
            });
        }
        Ok(session)
    }

    fn fetch_events(&self, session_id: &str) -> Result<Vec<RawEvent>, StreamError> {
        let events: Vec<RawEvent> = self.read_json("events.json")?;
        // Defensive: drop any event for a different session_id; never seen
        // in well-formed fixtures but cheap to guard against.
        Ok(events
            .into_iter()
            .filter(|e| e.session_id == session_id)
            .collect())
    }

    fn fetch_signers(&self, _session_id: &str) -> Result<SignerRegistry, StreamError> {
        self.read_json("signers.json")
    }
}

/// Convenience accessor for the source root — useful for log messages.
impl FileEventSource {
    pub fn root(&self) -> &Path {
        &self.root
    }
}
