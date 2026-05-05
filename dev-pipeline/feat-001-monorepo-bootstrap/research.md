# FEAT-001 — Research

## Context

Phase 0 of the project. The repo currently has docs + dev-pipeline + Obsidian vault. No code workspaces yet. We need a dual workspace (Bun for TS, Cargo for Rust) at the repo root, lint/format/typecheck commands, CI skeletons that actually run something, and an expanded `.gitignore`.

## Toolchain — verified versions (2026-05-05)

| Tool | Required | Available locally |
|------|----------|-------------------|
| Bun | ≥ 1.3 | 1.3.6 ✓ |
| Node | ≥ 22 | 24.10.0 ✓ |
| Rust stable | ≥ 1.80 | 1.93.1 ✓ |
| Biome | 2.x | will pin during install |
| `@gala-chain/cli` | 3.1.1 (verified npm) | will install per-app in FEAT-003 |

## Open questions resolved (decisions made for Plan freeze)

### Q-A — When does `apps/chaincode` get scaffolded?

**Decision:** NOT in FEAT-001. The GalaChain CLI's `galachain init` is run in FEAT-003 (`chaincode-domain-model`) and the resulting folder is merged into the Bun workspace there. FEAT-001's Bun `workspaces: ["apps/*", "packages/*"]` glob accepts an empty match — no error. Same for `packages/*` — `packages/result-helpers` lands in FEAT-002, glob is empty until then.

**Why:** mixing chaincode template scaffolding into bootstrap muddles the commit history and forces premature decisions about chaincode source layout. Keep FEAT-001 narrow.

### Q-B — Stub Rust crates now or wait?

**Decision:** Stub them now in FEAT-001. Cargo's `[workspace] members = ["crates/*", "apps/audit-verifier", "apps/dto-signer"]` errors if listed members don't have a `Cargo.toml`. Acceptance criterion explicitly requires `cargo check --workspace` to succeed. So:

- `crates/dto-canon/` — `Cargo.toml` (lib) + `src/lib.rs` (empty `pub fn placeholder() {}` to keep clippy happy)
- `apps/audit-verifier/` — `Cargo.toml` (bin) + `src/main.rs` (empty `fn main() {}`)
- `apps/dto-signer/` — same as audit-verifier

FEAT-006/007/008 will fill these crates with real content. Stubs ship now.

### Q-C — `tsconfig.base.json` types reference to `@gala-audit-trail/result-helpers/globals-types`

**Decision:** Include the types reference now. The package doesn't exist until FEAT-002, but `tsc --noEmit` won't be run until there's actual TS code (FEAT-003), so an unresolved types ref doesn't fail anything in FEAT-001's CI. When FEAT-002 lands, the ref resolves automatically.

**Risk:** if someone runs `tsc` against an empty workspace before FEAT-002, they see a "type definitions not found" error. Acceptable for a 1-week showcase — and FEAT-002 is the very next feature.

### Q-D — CI: real commands or no-ops?

**Decision:** Real commands, even on empty workspace. Acceptance says "bun install succeeds; cargo check --workspace succeeds". So CI runs:

- TS pipeline: `bun install` → `bun run lint` (Biome) → `bun run typecheck` (`tsc --noEmit`, no-op until TS code lands but config already strict)
- Rust pipeline: `cargo fmt --check` → `cargo clippy --workspace --all-targets -- -D warnings` → `cargo test --workspace`

Both green from day 1 with empty stubs.

### Q-E — `.gitignore` scope

**Decision:** Add Node/Bun/Next/Rust/env entries but NOT GalaChain SDK output (chaincode build artifacts) — those land when FEAT-003 ships `apps/chaincode`. Keep gitignore growing per feature, not over-eagerly.

**FEAT-001 adds:**
```
node_modules/
**/node_modules/
.bun/
bun.lockb
dist/
.next/
*.tsbuildinfo
target/
.env
.env.local
.env.*.local
.DS_Store
```

Keep `bun.lock` (text format) tracked — convention #6 of the playbook (`bun.lock` is authoritative).

## External deps to install (root devDependencies)

- `@biomejs/biome` (latest 2.x) — `bun add -d --latest @biomejs/biome`
- `typescript` (latest stable, ~5.x) — `bun add -d --latest typescript`

That's it for FEAT-001. No runtime deps. No frontend / chaincode deps yet.

## CI provider versions

- `oven-sh/setup-bun@v2` (Bun)
- `dtolnay/rust-toolchain@stable` (Rust)
- Cache via `actions/cache@v4` for `~/.bun/install/cache` and `~/.cargo/registry`

## No remaining blockers

All Research questions answered. Proceeding to Plan.
