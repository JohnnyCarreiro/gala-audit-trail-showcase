# How I Work

A short description of the methodology behind this project. The structure is identical to how I run larger projects — distilled here to fit a 1-week deliverable.

## Structure first, code second

I model every project around a few load-bearing artifacts:

- **SRS** ([`srs.md`](./srs.md)) — requirements and scope. What's in, what's out, who the users are, what they pay for or use it for.
- **SAD** ([`sad.md`](./sad.md)) — system architecture. Bounded contexts, components, data flow, technology choices traceable to ADRs.
- **ADRs** ([`adrs/`](./adrs/)) — Architecture Decision Records. One per non-obvious choice, with Context / Decision / Alternatives / Consequences.
- **SDDs** ([`sdds/`](./sdds/)) — Software Design Documents. One per bounded context in a real project. **For this 1-week showcase I wrote two**, covering the chaincode domain and the off-chain verifier — the rest is folded into the playbook + ADRs to stay light. In a production project I'd expand to one SDD per context.
- **Playbook** ([`playbook.md`](./playbook.md)) — conventions. Result/Option discipline, error shape, file size, commit rules. Every contributor (human or AI) reads it before writing code.
- **Pipeline** ([`../dev-pipeline/`](../dev-pipeline/)) — work tracking. One folder per Feature or Epic, each with its own RPA or Spec-kit artifacts (see below).

This is not ceremony for ceremony's sake. Each artifact answers a different question:

| Question | Answered by |
|----------|------------|
| *What is the system supposed to do?* | SRS |
| *How is it shaped?* | SAD |
| *Why this choice and not another?* | ADR |
| *How does this context work internally?* | SDD |
| *How do contributors write code here?* | Playbook |
| *What's being worked on right now?* | Pipeline (Feature / Epic cards) |

## RPA and Spec-kit — two flows for two unit sizes

Work is tracked in [`../dev-pipeline/`](../dev-pipeline/), one folder per item. Two sizes, two flows:

- **Feature** (atomic, ~1–5 days) → **RPA**: Research → Plan → Act. Folder contains `feature.md` (the requirement), `research.md`, `plan.md`, `tasks.md`. Block on Research questions; freeze the Plan before acting; one commit per Task.
- **Epic** (multi-feature orchestration) → **Custom Spec-kit**: Specify → Plan → Tasks → Execute. Folder contains `spec.md`, `plan.md`, `tasks.md`, and references child Feature folders by slug.

"Custom Spec-kit" because the spec already arrives with the work item — Specify here means **absorbing** the incoming artifact and deliberating, not writing a spec from scratch.

In this repo: 5 Features (RPA) + 1 Epic with 3 child Features (Spec-kit). The Rust off-chain verifier is the Epic — it's three sub-features that have to land coherently.

## How AI fits in

I architect the work. AI agents (Claude Code) accelerate execution.

| What I do | What AI does |
|-----------|--------------|
| Decide bounded contexts, aggregates, error model, technology choices | Implements per the playbook and ADRs |
| Write the SRS, SAD, and key ADRs | Drafts code, tests, and documentation per the spec |
| Curate prompts and review output critically | Generates code from prompts |
| Set conventions in the playbook | Enforces conventions across the codebase |
| Decide what *not* to build | Implements what was decided |

AI is an accelerator, not a designer. The structure described above is what makes AI productive: clear bounded contexts let agents work in narrow scope; explicit conventions in the playbook prevent drift; ADRs preserve the *why* that survives turnover (human or model).

## What's the same with or without AI

Everything above. The SRS, SAD, ADRs, SDDs, playbook, RPA, Spec-kit, the pipeline structure — none of it depends on having an AI assistant. I've used the same shape across:

- **AI-led, solo human in the loop** — this showcase, and an ongoing personal project (MyApprofile, B2C career-management platform on a Tauri/Next/Rust/Bun monorepo) where Claude Code is the primary code-writing agent.
- **AI under controlled access** — a Polkadot/Substrate audit-trail parachain in production at Multiledgers. Claude Code was authorized for three people only (myself, one senior, the tech lead); the rest of the team worked AI-free against the same artifacts. Same SRS/SAD/ADRs read by both groups.
- **Humans only, mixed seniority** — TypeScript backends with junior engineers building against shared documentation.
- **Solo human, no AI** — documentation-first migration tools processing billions of records.

AI changes the speed of execution and shifts where I spend time (more architecture, less typing). It doesn't change the discipline. The structure is what makes the work legible regardless of executor mix or who is and isn't authorized to use AI on the team.

## How to evaluate this repo

- The README sells the product in 30 seconds.
- This file explains the methodology in 3 minutes.
- The SAD shows the system in 5 minutes.
- The two load-bearing ADRs (0005 — Result/Exception boundary; 0007 — off-chain verification strategy) show the engineering judgment in 5 minutes.
- The code shows the execution.

If any of those break the claim made by the previous one, that's the bug worth flagging.
