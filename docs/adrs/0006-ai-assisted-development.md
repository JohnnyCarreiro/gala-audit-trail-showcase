---
id: ADR-0006
title: AI-assisted development methodology
status: proposed
date: 2026-05-05
---

# ADR-0006 — AI-assisted development methodology

## Status

Proposed.

## Context

This project was built with Claude Code (Anthropic) as the primary code-writing agent, under the author's direction. The Gala application (and the broader engineering culture) considers AI assistance a normal part of senior workflow — but the *quality* of AI-assisted output depends entirely on how the work is structured. A bad structure produces garbage no matter who or what is writing the code.

## Decision

The project follows the same methodology described in [`docs/HOW_I_WORK.md`](../HOW_I_WORK.md), which long predates the use of AI on the author's projects. Key principles:

1. **Architecture is human.** Bounded contexts, aggregates, error model, technology choices, the playbook — written and decided by the human before AI touches code.
2. **Explicit conventions in the playbook.** The playbook is the single source of truth for "how we write code here". AI agents read it before every contribution.
3. **One artifact per question** — SRS for "what", SAD for "shape", ADR for "why this not that", SDD for "how this context works", playbook for "how do we write code". This prevents context bloat (the binding constraint for AI agents) and gives every question a stable answer.
4. **RPA / Spec-kit for execution.** Each Feature or Epic gets its own folder under `dev-pipeline/`. Research is done first (with the human resolving open questions); Plan is frozen; Act produces commits.
5. **Critical review of output.** Every AI commit is reviewed by the human before merge. The author's value is judgment, not typing speed.
6. **The structure works without AI.** This methodology was used for years before AI agents became viable. AI changes the speed of execution; it doesn't change the discipline.

## Alternatives considered

- **No AI usage** — slower for a 1-week deadline.
- **AI-led architecture** — produces drift; the model can't hold a consistent architectural vision across many sessions.
- **Vibes-based prompting without an explicit playbook** — produces inconsistent code that requires constant rewrites at review time.

## Consequences

- The prompt that drives AI work is itself an artifact, curated under [`docs/ai-workflow/prompts/`](../ai-workflow/prompts/).
- Iteration notes during the build are kept in [`docs/ai-workflow/notes.md`](../ai-workflow/notes.md) as a journal — what was tried, what was course-corrected, what was rejected.
- The README's "How this was built" section credits the methodology and the tooling honestly, without overcelebrating either.

## Links

- [`docs/HOW_I_WORK.md`](../HOW_I_WORK.md)
- [`docs/ai-workflow/methodology.md`](../ai-workflow/methodology.md)
