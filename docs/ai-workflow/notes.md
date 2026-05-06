# AI workflow — iteration notes

A running journal of what was tried, what was course-corrected, what was rejected. Reviewers can read this to see how the build evolved.

## Convention

Each entry is dated and tagged. Format:

```
## YYYY-MM-DD — short title

**Context:** what we were doing
**Tried:** what the agent produced
**Outcome:** kept / course-corrected / rejected
**Reason:** why
```

Do not edit past entries — append only. The journal is an honest record, not a clean narrative.

---

## 2026-05-05 — Project bootstrap

**Context:** Initial scaffolding of `docs/` and `dev-pipeline/`.
**Tried:** Following the my-approfile playbook structure (1360-line playbook, full SDD per bounded context, redline-tracker for read-only docs).
**Outcome:** Course-corrected.
**Reason:** Showcase scope is 1 week; the full structure produces ~3000 lines of markdown overhead alone. Distilled the playbook to ~200 lines and reduced SDDs to two (chaincode-domain + off-chain-verifier). Kept the RPA / Spec-kit shape unchanged — that's load-bearing for the methodology demo.

## 2026-05-05 — Error shape decision

**Context:** Initial prompt suggested discriminated-union-with-`type`-field for `DomainError`.
**Tried:** That shape, with `match(err, cases, "type")`.
**Outcome:** Rejected.
**Reason:** The author's production convention is const-object-as-enum + `EnumValues<typeof X>` (no `type` field, `match(err, cases)` keys on the variant name directly). Aligned the prompt and ADR-0005 with the production convention.

## 2026-05-05 — Course correction on Git Flow strictness

**Context:** I committed FEAT-001 directly to `dev` per a "Phase 0 direct commits allowed" exception that I myself wrote into the playbook earlier in the same day.
**Tried:** Followed the documented exception.
**Outcome:** Course-corrected by the owner.
**Reason:** Strict Git Flow from day 1, no exceptions for bootstrap. All feature work via `feat/<slug>` branch + PR with explicit owner approval before merge. The exception was removed across `docs/playbook.md`, `AGENTS.md`, `dev-pipeline/README.md`, and the FEAT-001 feature card. The 5 FEAT-001 commits were preserved on a `feat/monorepo-bootstrap` branch and removed from `dev` via force-reset (with explicit owner approval), so FEAT-001 will land via PR as the new convention now requires. Lesson: when a convention is being authored by the same agent that will follow it, the convention's exceptions need owner sign-off before being used. Future hardening to consider: pre-push githook blocking direct commits to `dev`/`main` locally + GitHub branch protection rules as server-side enforcement.

<!-- Add new entries below as the project evolves. -->
