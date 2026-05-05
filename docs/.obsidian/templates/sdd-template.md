<%*
const id = await tp.system.prompt("SDD ID (e.g. 003)");
const title = await tp.system.prompt("Bounded context name");
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
await tp.file.rename(`sdd-${slug}`);
const date = tp.date.now("YYYY-MM-DD");
-%>
---
id: SDD-<% id %>
title: <% title %>
status: draft
date: <% date %>
---

# SDD-<% id %> — <% title %>

## 1. Bounded context

<!-- What does this context own? Where does it live in the repo? Dependencies on other contexts. -->

## 2. Aggregates and entities

<!-- Name them. For each aggregate root, list fields with types. For each entity inside an aggregate, same. -->

## 3. Use cases

<!-- One row per use case: input, output, errors. Pure functions returning Result<T, E> per the playbook. -->

| Use case | Input | Output |
|----------|-------|--------|
| | | |

## 4. Invariants

<!-- Each invariant gets at least one explicit test. Number them. -->

1.

## 5. Errors

<!-- Const-object-as-enum + EnumValues<typeof X> per the playbook. List variants. -->

## 6. Ports / external dependencies

<!-- Third-party libs, SDK boundaries. Where adapters live. -->

## 7. Open items

<!-- Tracked in docs/open-questions.md. Reference by ID. -->
