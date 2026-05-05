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

<!-- Add new entries below as the project evolves. -->
