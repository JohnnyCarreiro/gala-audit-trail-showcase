# Gala Audit Trail Showcase

**On-chain audit trail for game sessions** — a TypeScript chaincode on the GalaChain SDK that cryptographically registers session lifecycle events (initiation, intermediate checkpoints, final outcome), a Next.js frontend connecting via `@gala-chain/connect`, **and an off-chain verifier in Rust that independently re-checks the hash chain straight from the public ledger** — *trust, but verify*.

## Use Cases

Tournament integrity, anti-cheat verification, replay attestation, verifiable leaderboards.

## Stack

- **Chaincode** — TypeScript on GalaChain SDK (`@gala-chain/api`, `@gala-chain/chaincode`)
- **Frontend** — Next.js 16+ App Router via `@gala-chain/connect`, with **Tailwind CSS v4 + shadcn/ui**
- **Off-chain verifier** — Rust binary (`apps/audit-verifier`) backed by a pure library (`crates/dto-canon`); reproduces GalaChain's secp256k1/keccak256 signing scheme via `k256` + `sha3` and recomputes the hash chain from public TNT gateway data. Bonus `apps/dto-signer` CLI demos library reusability.
- **Result/Option discipline app-wide** — [`@consolidados/results`](https://github.com/ConsoliDados/results) on the TS side; native `Result<T, E>` + `thiserror` enums on the Rust side. Single throw site in the chaincode is the SDK boundary adapter.
- **Underlying L1** — Hyperledger Fabric (GalaChain)

## Status

🟡 **Active development.** Full functional delivery targeted within 1 week (started 2026-05-05).

This repository will progressively receive:
- TypeScript chaincode with pure domain layer (Result-based) + contract layer adapting to `ChainError` at the SDK boundary
- TS test suite (unit + integration via `@gala-chain/test`)
- Next.js frontend with full connect→initiate→checkpoint→finalize→verify flow on Tailwind v4 + shadcn/ui
- **Rust off-chain verifier** consuming the TNT gateway REST API, recomputing the hash chain via `crates/dto-canon`, emitting tampering proofs (3 scenarios covered: sequence gap, payload mutation, signature mismatch)
- Live TNT deployment + public demo URL (frontend on Vercel, verifier reproducible via `cargo run`)
- Architecture documentation: SRS, SAD, 7 ADRs (domain model, event sequencing, signature strategy, frontend architecture, Result/Exception boundary, AI methodology, off-chain verification strategy), 2 SDDs

## Methodology

Built using DDD bounded contexts, a strict playbook, and an RPA / Spec-kit pipeline — see [`docs/HOW_I_WORK.md`](./docs/HOW_I_WORK.md). The same structure works with or without AI assistance; here Claude Code is the primary code-writing agent, under explicit human direction. Architecture, conventions, and ADRs are human-owned; agent execution is reviewed before every merge.

## Author

Johnny Carreiro — Senior Full-stack Engineer
[GitHub](https://github.com/JohnnyCarreiro) · [LinkedIn](https://linkedin.com/in/johnnycarreiro) · [Site](https://johnnycarreiro.com)
