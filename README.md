# Gala Audit Trail Showcase

**On-chain audit trail for game sessions** — a TypeScript chaincode for the GalaChain SDK that cryptographically registers session lifecycle events (initiation, intermediate checkpoints, final outcome), paired with a Next.js frontend connecting via `@gala-chain/connect`.

## Use Cases

Tournament integrity, anti-cheat verification, replay attestation, verifiable leaderboards.

## Stack

- TypeScript chaincode on GalaChain SDK (`@gala-chain/api`, `@gala-chain/chaincode`)
- Next.js 16+ frontend via `@gala-chain/connect`
- Result type at domain boundary via [`@consolidados/results`](https://github.com/ConsoliDados/results)
- Hyperledger Fabric (underlying GalaChain L1)

## Status

🟡 **Active development.** Full functional delivery targeted within 1 week (started 2026-05-05).

This repository will progressively receive:
- TypeScript chaincode with domain layer (Result-based) + contract layer (ChainError-based)
- Test suite (unit + integration)
- Next.js frontend with full connect→initiate→checkpoint→finalize→verify flow
- Live TNT deployment + public demo URL
- Architecture documentation (ADRs covering domain model, event sequencing, signature strategy, Result/Exception boundary, AI-assisted methodology)

## Author

Johnny Carreiro — Senior Full-stack Engineer
[GitHub](https://github.com/JohnnyCarreiro) · [LinkedIn](https://linkedin.com/in/johnnycarreiro) · [Site](https://johnnycarreiro.com)
