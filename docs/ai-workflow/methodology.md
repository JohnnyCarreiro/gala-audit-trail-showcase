# AI workflow — methodology

This is a per-project distillation of the methodology described in [`../HOW_I_WORK.md`](../HOW_I_WORK.md). Read that file first.

## Principles applied here

1. **Architecture first.** Every artifact under `docs/` was either authored by the human or shaped by the human and drafted by the agent under explicit direction. The human owns: bounded contexts, error model, ADR decisions, the playbook conventions, the SRS scope.
2. **Playbook before code.** [`../playbook.md`](../playbook.md) was written before any chaincode line. AI agents read it before contributing.
3. **RPA per Feature.** Each `feat-NNN-*` folder under [`../../dev-pipeline/`](../../dev-pipeline/) goes through Research → Plan → Act, with the human resolving open questions before Plan freezes.
4. **Spec-kit for the Epic.** The Rust off-chain verifier is an Epic with three child Features. Spec lives in [`../../dev-pipeline/epic-rust-off-chain-verifier/spec.md`](../../dev-pipeline/epic-rust-off-chain-verifier/spec.md).
5. **Critical review of every commit.** AI commits are reviewed by the human before merge to `dev`.
6. **Iteration journal.** [`./notes.md`](./notes.md) tracks what was tried, what was course-corrected, and what was rejected.

## Tooling

- **Claude Code** as the primary execution agent.
- **The prompt** that drives Claude Code is curated under [`./prompts/`](./prompts/) — sanitized of any project-internal references that don't belong in a public repo.
- Conventional Commits + Git Flow per the playbook.

## Why the structure works without AI

The author has used the same shape (SRS, SAD, ADRs, SDDs, RPA, Spec-kit) across very different executor mixes:

- **AI-led, solo human in the loop** — this showcase, and an ongoing personal project (MyApprofile, B2C career-management platform on Tauri/Next/Rust/Bun monorepo) where Claude Code is the primary code-writing agent.
- **AI under controlled access** — a Polkadot/Substrate parachain in production at Multiledgers (audit trail, Rust). Claude Code was authorized for three people only (the author + one senior engineer + the tech lead); the rest of the team worked AI-free against the same artifacts.
- **Humans only, mixed seniority** — TypeScript backends with junior engineers building against the same SRS/SAD/ADRs.
- **Solo human, no AI** — documentation-first migration tools processing billions of records.

In every case the methodology was the same. AI changes the speed of execution and shifts where the human spends time (more architecture, less typing); it doesn't change the discipline. The point reviewers should take from this project: the structure is what makes the work legible — to humans, to AI, and to future contributors regardless of who or what they are or what authorization model the team operates under.

## Scope of this directory

| File | Purpose |
|------|---------|
| `methodology.md` (this file) | Per-project methodology summary |
| `notes.md` | Journal of iterations, course-corrections, rejected paths |
| `prompts/claude-code-prompt.md` | Curated, sanitized version of the working prompt that drove the agent |
