# FEAT-001 — Tasks

Live checklist. Tick as we go.

## G1 — TS workspace foundation

- [x] T1.1 — Write root `package.json`
- [x] T1.2 — Write `tsconfig.base.json` (+ thin `tsconfig.json` extending it; types ref moved to per-app configs per Q-C revision)
- [x] T1.3 — Write `biome.json` (with `!docs/.obsidian` exclude — Obsidian plugin minified JS was breaking the lint scan)
- [x] T1.4 — Run `bun install` (generates `bun.lock`)
- [x] T1.5 — Expand `.gitignore`
- [x] **C1** — Commit: `chore(monorepo): bootstrap Bun workspace with Biome and strict TypeScript`

## G2 — Cargo workspace + Rust stubs

- [x] T2.1 — Write root `Cargo.toml` (resolver 2, edition 2021, rust-version 1.80, workspace lints: forbid unsafe + warn unwrap/expect/panic, release profile with thin LTO)
- [x] T2.2 — Stub `crates/dto-canon` (lib, doc-comment-only)
- [x] T2.3 — Stub `apps/audit-verifier` (bin, prints "stub")
- [x] T2.4 — Stub `apps/dto-signer` (bin, prints "stub")
- [x] T2.5 — Verified: `cargo check --workspace`, `fmt --check`, `clippy -D warnings`, `test --workspace` all green
- [x] **C2** — Commit: `chore(monorepo): bootstrap Cargo workspace with stub crates for audit-verifier, dto-signer, dto-canon`

## G3 — CI workflows

- [x] T3.1 — Write `.github/workflows/lint-and-typecheck.yml` (Bun setup, install --frozen-lockfile, biome, tsc --noEmit, conditional tests)
- [x] T3.2 — Write `.github/workflows/rust-ci.yml` (rust stable + components, Swatinem/rust-cache, fmt --check, clippy -D warnings, test --workspace)
- [x] **C3** — Commit: `ci(monorepo): add TypeScript and Rust pipelines`

## G4 — Verification

- [x] T4.1 — Full local run end-to-end: `bun install --frozen-lockfile` ok, `bun run lint` clean, `bun run typecheck` clean, `cargo fmt --all -- --check` clean, `cargo clippy --workspace --all-targets -- -D warnings` clean, `cargo test --workspace` clean

## G5 — Husky (added mid-flight per owner; FEAT-001 scope)

- [x] T5.1 — `bun add -d husky` + `bunx husky init` (installs husky 9.1.7, adds `prepare` script to `package.json`, creates `.husky/_/` runtime)
- [x] T5.2 — Write `.husky/pre-commit` blocking direct commits on `dev`/`main` with override docs in failure output
- [x] T5.3 — Write `.husky/pre-merge-commit` blocking local merges into `dev`/`main` (same override docs)
- [x] T5.4 — `chmod +x` both hooks
- [x] T5.5 — Sanity test: simulated repo on `dev` blocks (exit 1); on `feat/*` allows (exit 0)
- [x] **C5** — Commit: `feat(monorepo): add husky pre-commit and pre-merge-commit hooks`

## G6 — Close + push

- [x] Course-corrected from direct-to-dev merge to feat-branch + PR flow (see `docs/ai-workflow/notes.md`)
- [x] Update `feature.md` status `in-progress → done` and tick all acceptance boxes (incl. husky)
- [ ] Push `feat/monorepo-bootstrap` to `origin`
- [ ] Wait for owner validation → owner gives explicit OK → open PR via `gh`