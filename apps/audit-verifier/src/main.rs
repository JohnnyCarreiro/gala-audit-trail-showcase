//! `audit-verifier` CLI entry point.
//!
//! Only file in the crate allowed to use `anyhow::Result` — sub-modules
//! return their own `thiserror` enums, this aggregator converts to
//! `anyhow::Error` at the boundary with the OS / shell exit code.
//!
//! # Usage
//!
//! ```text
//! audit-verifier verify --session-id <uuid> --source <path-to-dir>
//! ```
//!
//! where `<path-to-dir>` contains `session.json`, `events.json`,
//! `signers.json` (file-based source; the HTTP-based TNT gateway source
//! is deferred behind OQ-03).
//!
//! Exit codes:
//!   - `0` — verdict produced (regardless of whether it's Valid or Tampered)
//!   - `1` — input was structurally broken (couldn't even fetch / parse)

use anyhow::{Context, Result};
use audit_verifier::{verify_chain, EventSource, FileEventSource, ProofReport};
use clap::{Parser, Subcommand};
use std::path::PathBuf;
use std::process::ExitCode;

#[derive(Parser, Debug)]
#[command(
    name = "audit-verifier",
    version,
    about = "Off-chain verifier for Gala audit trails."
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand, Debug)]
enum Command {
    /// Verify a session's hash chain and signatures.
    Verify {
        /// Session UUID to verify.
        #[arg(long)]
        session_id: String,

        /// Directory containing `session.json`, `events.json`, `signers.json`.
        #[arg(long, value_name = "PATH")]
        source: PathBuf,
    },
}

fn run(cli: Cli) -> Result<()> {
    match cli.command {
        Command::Verify { session_id, source } => verify_session(&session_id, source),
    }
}

fn verify_session(session_id: &str, source_root: PathBuf) -> Result<()> {
    let src = FileEventSource::new(&source_root);
    let session = src
        .fetch_session(session_id)
        .with_context(|| format!("fetching session from {}", src.root().display()))?;
    let events = src
        .fetch_events(session_id)
        .with_context(|| format!("fetching events from {}", src.root().display()))?;
    let signers = src
        .fetch_signers(session_id)
        .with_context(|| format!("fetching signer registry from {}", src.root().display()))?;

    let verdict = verify_chain(&session, &events, &signers).context("running chain verifier")?;

    let report = ProofReport::build(&session, events.len(), verdict);
    let pretty = report
        .to_pretty_json()
        .context("serializing proof report")?;
    println!("{pretty}");
    Ok(())
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    match run(cli) {
        Ok(()) => ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("audit-verifier: {err:#}");
            ExitCode::FAILURE
        }
    }
}
