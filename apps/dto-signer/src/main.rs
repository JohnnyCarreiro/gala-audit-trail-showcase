//! `dto-signer` — thin CLI on top of `dto-canon`. Reads a DTO + private
//! key from stdin, emits canonical bytes + signature + signer public key.
//!
//! Useful for debugging signed DTOs against a deployed chaincode and as
//! a live demo of `dto-canon`'s reusability across binaries (the verifier
//! consumes the same canonicalize / sign primitives).
//!
//! # Usage
//!
//! ```text
//! echo '{"dto":{"sessionId":"abc","payload":{"x":1}},"privateKeyHex":"0101..."}' \
//!   | dto-signer
//! ```
//!
//! ```text
//! {
//!   "canonicalHex": "7b22...",
//!   "signatureHex": "abcd...1b",
//!   "signerPubkey": "04ed..."
//! }
//! ```

use anyhow::{Context, Result};
use dto_canon::{canonicalize_for_signing, sign};
use k256::ecdsa::SigningKey;
use serde::{Deserialize, Serialize};
use std::io::Read;
use std::process::ExitCode;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SignerInput {
    /// The DTO to sign — any JSON object. Canonicalized via
    /// `dto_canon::canonicalize_for_signing` (top-level `signature` and
    /// `trace` stripped, recursive alphabetical key sort, no whitespace).
    dto: serde_json::Value,
    /// 32 bytes hex (with or without `0x` prefix).
    private_key_hex: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SignerOutput {
    canonical_hex: String,
    signature_hex: String,
    signer_pubkey: String,
}

fn run() -> Result<()> {
    let mut buf = String::new();
    std::io::stdin()
        .read_to_string(&mut buf)
        .context("reading stdin")?;
    let input: SignerInput = serde_json::from_str(&buf).context("parsing stdin JSON")?;

    let canonical = canonicalize_for_signing(&input.dto).context("canonicalizing dto")?;
    let signature = sign(&input.private_key_hex, &canonical).context("signing canonical bytes")?;
    let signer_pubkey = derive_pubkey(&input.private_key_hex).context("deriving signer pubkey")?;

    let out = SignerOutput {
        canonical_hex: hex::encode(&canonical),
        signature_hex: signature,
        signer_pubkey,
    };
    let pretty = serde_json::to_string_pretty(&out).context("serializing output")?;
    println!("{pretty}");
    Ok(())
}

/// Derives the SEC1-uncompressed public key hex (`04 || x || y`) from a
/// private key hex string. The bonus CLI's job — `dto-canon` itself
/// doesn't expose this helper (deliberately, the lib is sign/verify
/// only), so the binary glues `k256` and `dto-canon` together at this
/// one spot.
fn derive_pubkey(private_key_hex: &str) -> Result<String> {
    let stripped = private_key_hex
        .strip_prefix("0x")
        .unwrap_or(private_key_hex);
    let bytes = hex::decode(stripped).context("decoding private key hex")?;
    let signing_key =
        SigningKey::from_slice(&bytes).context("constructing SigningKey from bytes")?;
    Ok(hex::encode(
        signing_key
            .verifying_key()
            .to_encoded_point(false)
            .as_bytes(),
    ))
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("dto-signer: {err:#}");
            ExitCode::FAILURE
        }
    }
}
