# FEAT-001 — Plan

Frozen after Research. 4 task groups, each ending in a commit.

## Task groups

### G1 — TS workspace foundation
1. Create `package.json` at root (private, workspaces: `["apps/*", "packages/*"]`, devDependencies, scripts, engines)
2. Create `tsconfig.base.json` (strict, target ES2022, module ESNext, moduleResolution Bundler, types ref to result-helpers globals)
3. Create `biome.json` (extends nothing, configured per playbook: 2 spaces, double quotes, semicolons always)
4. Run `bun install` — generates `bun.lock`
5. Expand `.gitignore` with Node/Bun/Next/Rust/env entries
6. **Commit**: `chore(monorepo): bootstrap Bun workspace with Biome and strict TypeScript`

### G2 — Cargo workspace + Rust stubs
7. Create root `Cargo.toml` (`[workspace]`, members = crates + 2 apps, resolver = "2", default profile tweaks)
8. Create `crates/dto-canon/Cargo.toml` + `crates/dto-canon/src/lib.rs` (placeholder)
9. Create `apps/audit-verifier/Cargo.toml` + `apps/audit-verifier/src/main.rs` (placeholder `fn main() {}`)
10. Create `apps/dto-signer/Cargo.toml` + `apps/dto-signer/src/main.rs` (same)
11. Run `cargo check --workspace` — confirm green; `cargo fmt --all`; `cargo clippy --workspace -- -D warnings`
12. **Commit**: `chore(monorepo): bootstrap Cargo workspace with stub crates for audit-verifier, dto-signer, dto-canon`

### G3 — CI workflows
13. Create `.github/workflows/lint-and-typecheck.yml` (TS pipeline: install → biome check → tsc --noEmit)
14. Create `.github/workflows/rust-ci.yml` (Rust pipeline: fmt --check → clippy -D warnings → cargo test)
15. **Commit**: `ci(monorepo): add TypeScript and Rust pipelines`

### G4 — Verification + push
16. Run all commands locally one more time end-to-end (`bun install` clean, `bun run lint`, `bun run typecheck`, `cargo check --workspace`, `cargo clippy --workspace -- -D warnings`, `cargo fmt --check`, `cargo test --workspace`)
17. Update `dev-pipeline/feat-001-monorepo-bootstrap/feature.md` frontmatter `status: planned → done`
18. Push `dev` to `origin`

## Acceptance criteria mapping (from feature.md)

| Criterion | Task |
|-----------|------|
| `package.json` at root with workspaces | G1.1 |
| `tsconfig.base.json` strict + types ref | G1.2 |
| `biome.json` per playbook | G1.3 |
| `Cargo.toml` workspace + members | G2.7 |
| `.github/workflows/*` skeletons | G3.13–14 |
| `bun install` succeeds | G1.4, G4.16 |
| `cargo check --workspace` succeeds | G2.11, G4.16 |
| `.gitignore` covers required entries | G1.5 |

## Out of scope (per feature.md)

- Any actual code in `apps/chaincode` (FEAT-003)
- `packages/result-helpers` content (FEAT-002)
- Rust crate logic (FEAT-006/007/008)

## Plan frozen — proceeding to Act