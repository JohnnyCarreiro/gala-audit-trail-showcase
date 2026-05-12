//! Raw event / session shapes — `serde` deserializes them straight off
//! the chaincode's JSON output (or a local fixture matching that shape).
//!
//! Field names use `camelCase` via `#[serde(rename_all)]` to match the
//! TS chaincode's `ChainObject` serialization.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// One persisted `SessionEvent` from the audit trail, in its on-chain
/// JSON shape (`GameSessionChainObject` / `SessionEventChainObject` from
/// `apps/chaincode/src/persistence/`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawEvent {
    pub event_id: String,
    pub session_id: String,
    pub sequence: u64,
    pub event_type: String,
    pub payload: serde_json::Value,
    /// `0x` + 64 hex chars (keccak256 of canonical(prev event); GENESIS_HASH for sequence 1).
    pub prev_hash: String,
    pub signed_by: String,
    pub signature: String,
    pub timestamp: String,
}

/// One `GameSession` aggregate root in on-chain JSON shape.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawSession {
    pub session_id: String,
    pub game_id: String,
    pub players: Vec<String>,
    pub studio_signer: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outcome_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

impl RawSession {
    /// The full set of identity keys allowed to sign events in this session
    /// per the domain rules (studio + all players).
    pub fn authorized_signers(&self) -> Vec<&str> {
        let mut signers = Vec::with_capacity(self.players.len() + 1);
        signers.push(self.studio_signer.as_str());
        for p in &self.players {
            signers.push(p.as_str());
        }
        signers
    }
}

/// Maps a chaincode `identityKey` (e.g., `"client|alice"`) to the SEC1
/// uncompressed public key hex (`04 || x || y`, 130 chars) that signed
/// the events. On a real deployed system this would come from the
/// chaincode's `UserProfile` mapping; for the showcase, a `signers.json`
/// alongside the session/events file carries it.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignerRegistry {
    pub keys: HashMap<String, String>,
}

impl SignerRegistry {
    pub fn lookup(&self, identity_key: &str) -> Option<&str> {
        self.keys.get(identity_key).map(String::as_str)
    }
}
