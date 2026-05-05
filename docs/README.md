# Documentation

Entry point for navigating the docs. The structure is a deliberate, lightweight version of the methodology used in the author's larger projects — see [`HOW_I_WORK.md`](./HOW_I_WORK.md).

## Map

| Doc | Audience | What's in it |
|-----|----------|--------------|
| [`HOW_I_WORK.md`](./HOW_I_WORK.md) | Reviewers | How I structure work — DDD, RPA, Spec-kit. Why the structure works with or without AI assistance. |
| [`playbook.md`](./playbook.md) | Engineers | Canonical conventions: Result/Option discipline, error shape, file size, commit/branch rules. |
| [`srs.md`](./srs.md) | Reviewers | Requirements and scope. ~1-2 pages. |
| [`sad.md`](./sad.md) | Reviewers | System architecture: contexts, sequence diagrams, technology choices. ~2-3 pages. |
| [`adrs/`](./adrs/) | Engineers | Architecture Decision Records (one per non-obvious decision). |
| [`sdds/`](./sdds/) | Engineers | Software Design Documents — per bounded context, lightweight for this project. |
| [`ai-workflow/`](./ai-workflow/) | Reviewers / engineers | How AI was used. The actual prompt is in `prompts/`; methodology in `methodology.md`. |
| [`deployment.md`](./deployment.md) | Engineers | TNT deploy + verifier reproducibility. |
| [`open-questions.md`](./open-questions.md) | Engineers | Things not yet resolved by the SDK or library docs. |

Active work tracking lives one level up in [`../dev-pipeline/`](../dev-pipeline/) — feature cards and epics, not architecture.

## Suggested reading order for reviewers

1. Repository [`README.md`](../README.md) (30 seconds — the elevator pitch)
2. [`HOW_I_WORK.md`](./HOW_I_WORK.md) (3 minutes — how this was built)
3. [`sad.md`](./sad.md) (5 minutes — the system at a glance)
4. [`adrs/0005-result-type-domain-boundary.md`](./adrs/0005-result-type-domain-boundary.md) and [`adrs/0007-off-chain-verification-strategy.md`](./adrs/0007-off-chain-verification-strategy.md) (the load-bearing decisions)
5. Code: `apps/chaincode/src/domain/` and `apps/audit-verifier/src/`

Total time investment for a reviewer: ~15 minutes to form a complete opinion.
