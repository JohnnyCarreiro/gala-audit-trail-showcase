# CLAUDE.md — Gala Audit Trail Showcase

## What this repo is

Showcase project: on-chain audit trail for game sessions on **GalaChain** (Hyperledger Fabric + TypeScript chaincodes), with Next.js frontend via `@gala-chain/connect` and an off-chain verifier in Rust. Built as a 1-week deliverable for a senior engineering application at Gala.

## Routing — features and epics

When the owner says *"vamos implementar `<slug-or-title>`"*:

1. **Scan** `dev-pipeline/` for matching folders.
2. **Identify the unit** from folder shape:
   - folder with `feature.md` → **Feature** → run **RPA** (Research → Plan → Act)
   - folder with `spec.md` → **Epic** → run **Custom Spec-kit** (Specify → Plan → Tasks → Execute)
3. **Confirm** with the owner before acting.

Operating manual: [`dev-pipeline/README.md`](./dev-pipeline/README.md).

## Conventions

Architecture, error model, Result/Option discipline, file size, commit/branch rules — all canonical conventions live in [`AGENTS.md`](./AGENTS.md), imported below.

@AGENTS.md
