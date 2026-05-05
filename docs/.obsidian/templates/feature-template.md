<%*
const id = await tp.system.prompt("Feature ID (e.g. 009)");
const slug = await tp.system.prompt("Feature slug (kebab-case)");
await tp.file.rename(`feature`);
await tp.file.move(`/dev-pipeline/feat-${id}-${slug}/feature`);
-%>
---
id: FEAT-<% id %>
slug: <% slug %>
status: planned
depends-on: []
blocks: []
---

# FEAT-<% id %> — <% slug.replace(/-/g, " ") %>

## Goal

<!-- One paragraph. Why does this feature exist? What outcome does it produce? -->

## Acceptance criteria

<!-- Checkboxes. Each one is testable. -->

- [ ]
- [ ]

## Scope

**In:**

**Out:**

## Open questions

<!-- Surface to docs/open-questions.md if they affect the Plan. -->

## Branch

`feat/<% slug %>`.
