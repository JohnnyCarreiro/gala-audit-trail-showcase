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

- [ ] T3.1 — Write `.github/workflows/lint-and-typecheck.yml`
- [ ] T3.2 — Write `.github/workflows/rust-ci.yml`
- [ ] **C3** — Commit: `ci(monorepo): add TypeScript and Rust pipelines`

## G4 — Verification + close

- [ ] T4.1 — Full local run: bun install (clean), bun run lint, bun run typecheck, cargo check, cargo clippy, cargo fmt --check, cargo test
- [ ] T4.2 — Update `feature.md` status frontmatter to `done`
- [ ] **C4** — Commit: `chore(meta): mark FEAT-001 done`
- [ ] Push `dev` to `origin`