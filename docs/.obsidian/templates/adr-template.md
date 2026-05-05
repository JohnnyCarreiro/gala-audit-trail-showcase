<%*
const id = await tp.system.prompt("ADR ID (e.g. 0008)");
const title = await tp.system.prompt("ADR title");
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
await tp.file.rename(`${id}-${slug}`);
const date = tp.date.now("YYYY-MM-DD");
-%>
---
id: ADR-<% id %>
title: <% title %>
status: proposed
date: <% date %>
---

# ADR-<% id %> — <% title %>

## Status

Proposed.

## Context

<!-- What's the situation? What problem are we solving, and why now? Cite forces and constraints. -->

## Decision

<!-- What did we decide? Be concrete. Include code shapes if useful. -->

## Alternatives considered

<!-- Two or three real alternatives, with the reason each was rejected. Honest trade-offs. -->

## Consequences

<!-- What changes because of this decision? Costs, benefits, risks, things future contributors should know. -->

## Links

<!-- Related ADRs, SDDs, external docs. -->
