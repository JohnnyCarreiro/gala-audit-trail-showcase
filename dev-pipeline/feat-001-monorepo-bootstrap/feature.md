---
id: FEAT-001
slug: monorepo-bootstrap
status: in-progress
depends-on: []
blocks: [FEAT-002, FEAT-003, FEAT-005]
---

# FEAT-001 — Monorepo bootstrap (Bun + Cargo workspaces)

## Goal

Stand up the dual-workspace skeleton (Bun for TS, Cargo for Rust) at the repo root. Establish lint, format, typecheck, and test commands. CI pipelines runnable.

## Acceptance criteria

- [ ] `package.json` at root with `"workspaces": ["apps/*", "packages/*"]`
- [ ] `tsconfig.base.json` with `"strict": true` (per-app `tsconfig.json` extends base and adds the `@gala-audit-trail/result-helpers/globals-types` types ref individually, since not all packages should pre-import the globals — e.g., `result-helpers` itself shouldn't self-reference)
- [ ] `biome.json` at root configured per playbook (2 spaces, double quotes, semicolons)
- [ ] `Cargo.toml` at root with `[workspace] members = ["crates/*", "apps/audit-verifier", "apps/dto-signer"]`
- [ ] `.github/workflows/lint-and-typecheck.yml` (TS) and `.github/workflows/rust-ci.yml` (Rust) skeletons in place
- [ ] `bun install` succeeds; `cargo check --workspace` succeeds (even with empty member crates)
- [ ] `.gitignore` covers `node_modules/`, `target/`, `dist/`, `.env`, `bun.lockb`

## Scope

**In:** workspace config, lint/format/test commands, CI skeletons, gitignore.
**Out:** any actual code in apps/ or crates/ — those land in subsequent features.

## Open questions

None at this point. Research phase will confirm Bun+Cargo coexistence in CI (likely OK; Bun and Rust toolchains run in parallel jobs).

## Branch

`feat/monorepo-bootstrap` — but per playbook, Phase 0 (initial bootstrap) commits direct to `dev`.
