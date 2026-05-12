# dev-pipeline

Active workspace for executing work on this project. Each Feature or Epic is a folder; closed work moves to `_archive/`.

## Two flows for two unit sizes

| Unit | Flow | Folder shape |
|------|------|--------------|
| **Feature** (atomic, ~1–5 days) | **RPA** — Research → Plan → Act | `feature.md`, `research.md`, `plan.md`, `tasks.md` |
| **Epic** (multi-feature orchestration) | **Custom Spec-kit** — Specify → Plan → Tasks → Execute | `spec.md`, `plan.md`, `tasks.md`, plus child Feature folders nested inside |

"Custom Spec-kit" because the spec arrives with the work — Specify means **absorbing** the incoming artifact + deliberating with the human, not writing a spec from scratch.

## Layout

```
dev-pipeline/
├── README.md                                 # this file
├── _archive/                                 # closed work items (history kept)
├── feat-NNN-<slug>/                          # Feature (RPA)
│   ├── feature.md                            # incoming requirement
│   ├── research.md                           # R — context, risks, clarifying questions
│   ├── plan.md                               # P — task decomposition + sequence
│   └── tasks.md                              # A — executable checklist
└── epic-<slug>/                              # Epic (Custom Spec-kit)
    ├── spec.md                               # S — absorbed spec + deliberation
    ├── plan.md                               # P — cross-feature plan
    ├── tasks.md                              # T — orchestration / links to children
    └── feat-NNN-<child-slug>/                # children nested under the epic
        └── feature.md                        # each child runs RPA inside the epic
```

## Routing — how the agent identifies a unit

When the owner says *"vamos implementar `<slug-or-title>`"*:

1. Scan `dev-pipeline/` for matching folders.
2. Determine the type from folder shape:
   - has `feature.md` → **Feature** → run RPA
   - has `spec.md` → **Epic** → run Custom Spec-kit
3. Confirm with the owner: *"encontrei `<slug>` como **feature**, vou seguir RPA. Ok?"*
4. Multiple matches → list and wait for disambiguation.

## Lifecycle

```
planned → in-progress → (blocked?) → done → archived
```

| Transition | How |
|------------|-----|
| `planned → in-progress` | First non-boilerplate file added (Research starts) |
| `in-progress → blocked` | Open question that affects Plan; halts work until resolved |
| `in-progress → done` | Branch merged to `dev` (or PR merged for Phase 1+) |
| `done → archived` | Folder moved to `_archive/<slug>/` to keep the active workspace lean |

## Branching

- **Always**: 1 Feature = 1 branch `feat/<feature-slug>` + PR to `dev`. One commit per Task. PR is reviewed and explicitly approved before merge. **No direct commits to `dev` or `main`** — including bootstrap features.
- **Epic-as-branch**: when child Features must land atomically and the Epic is < 1 sprint, use `feat/<epic-slug>` as integration branch; child Features merge into it via PR; Epic branch merges to `dev` via PR when all children are in. Branch prefix stays `feat/` — Git Flow has no `epic/` prefix.

## Frontmatter convention

Every `feature.md` / `spec.md` opens with frontmatter:

```yaml
---
id: FEAT-NNN
slug: <feature-slug>
status: planned | in-progress | blocked | done
depends-on: [FEAT-XXX, FEAT-YYY]
blocks: [FEAT-ZZZ]
---
```

Status changes are visible in `git diff`. No external tracker needed for this scope.

## Active items in this repo

| Item | Type | Status |
|------|------|--------|
| [`feat-001-monorepo-bootstrap`](./feat-001-monorepo-bootstrap/) | Feature | done |
| [`feat-002-result-helpers-package`](./feat-002-result-helpers-package/) | Feature | done |
| [`feat-003-chaincode-domain-model`](./feat-003-chaincode-domain-model/) | Feature | done |
| [`feat-004-chaincode-contract-layer`](./feat-004-chaincode-contract-layer/) | Feature | done |
| [`feat-005-frontend-bootstrap`](./feat-005-frontend-bootstrap/) | Feature | done |
| [`epic-rust-off-chain-verifier`](./epic-rust-off-chain-verifier/) | Epic | done |
| ↳ [`feat-006-dto-canon-lib`](./epic-rust-off-chain-verifier/feat-006-dto-canon-lib/) | Feature (child) | done |
| ↳ [`feat-007-audit-verifier-cli`](./epic-rust-off-chain-verifier/feat-007-audit-verifier-cli/) | Feature (child) | done |
| ↳ [`feat-008-dto-signer-bonus`](./epic-rust-off-chain-verifier/feat-008-dto-signer-bonus/) | Feature (child, **bonus**) | done |

> **Obsidian users:** the table below auto-renders via Dataview from feature frontmatter. GitHub readers see the static table above as the source of truth.

```dataview
TABLE
  status,
  depends-on AS "Depends on",
  blocks AS "Blocks"
FROM "dev-pipeline"
WHERE id
SORT id ASC
```
