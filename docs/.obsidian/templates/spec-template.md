<%*
const id = await tp.system.prompt("Epic ID (e.g. 002)");
const slug = await tp.system.prompt("Epic slug (kebab-case)");
await tp.file.rename(`spec`);
await tp.file.move(`/dev-pipeline/epic-${slug}/spec`);
-%>
---
id: EPIC-<% id %>
slug: <% slug %>
status: planned
type: epic
children: []
---

# EPIC-<% id %> — <% slug.replace(/-/g, " ") %>

## Why this epic exists

<!-- Strategic narrative. Why several features in coordination instead of one or many separate ones? -->

## Outcome / acceptance

- [ ]

## Children (sequenced)

| ID | Slug | Status | Dependency |
|----|------|--------|------------|
| | | planned | |

## Cut order if time runs out

1.
2.

## Branch strategy

<!-- Per playbook §branching — usually feat/<epic-slug> as integration branch. -->
