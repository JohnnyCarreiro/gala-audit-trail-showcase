//! Verifier proof report — the JSON shape the CLI emits on stdout.
//!
//! Stable contract for downstream consumers (UI, monitoring, audit log).
//! See SDD-002 §2.

use crate::chain::Verdict;
use crate::event::RawSession;
use serde::{Deserialize, Serialize};

/// Verifier output — version + the verdict + provenance metadata that
/// lets a reader reproduce the verification.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProofReport {
    /// Stable version tag — bump when the verdict / fields evolve.
    pub proof_version: &'static str,

    /// The session that was verified.
    pub session_id: String,
    pub game_id: String,
    pub session_status: String,

    /// How many events were considered in the verification.
    pub events_count: usize,

    /// Authorized signers at verification time (studio + players).
    /// Helps a reader understand the "scope" of authorized writers without
    /// re-fetching the session.
    pub authorized_signers: Vec<String>,

    /// The verdict itself.
    pub verdict: Verdict,

    /// Verifier identity. Useful when multiple verifiers (different
    /// implementations) cross-check the same session.
    pub verifier: VerifierInfo,
}

/// Identifies the verifier that produced this proof — version, tool name,
/// and the canonical-input convention used. Future verifier implementations
/// can be cross-checked by matching these.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifierInfo {
    pub tool: &'static str,
    pub version: &'static str,
    pub canonical_scheme: &'static str,
}

impl Default for VerifierInfo {
    fn default() -> Self {
        Self {
            tool: "audit-verifier",
            version: env!("CARGO_PKG_VERSION"),
            // Documents the agreement with `dto-canon::canonicalize_for_signing`.
            canonical_scheme:
                "serde_json::to_vec / BTreeMap-sorted keys / strip top-level signature+trace",
        }
    }
}

impl ProofReport {
    pub fn build(session: &RawSession, events_count: usize, verdict: Verdict) -> Self {
        Self {
            proof_version: "1",
            session_id: session.session_id.clone(),
            game_id: session.game_id.clone(),
            session_status: session.status.clone(),
            events_count,
            authorized_signers: session
                .authorized_signers()
                .into_iter()
                .map(String::from)
                .collect(),
            verdict,
            verifier: VerifierInfo::default(),
        }
    }

    /// Pretty-printed JSON. Stable for piping into `jq` or saving as a
    /// receipt.
    pub fn to_pretty_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }
}
