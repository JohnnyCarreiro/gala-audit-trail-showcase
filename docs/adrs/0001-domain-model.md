---
id: ADR-0001
title: Domain model — split Session and Event aggregates
status: proposed
date: 2026-05-05
---

# ADR-0001 — Domain model: split `Session` and `Event` aggregates

## Status

Proposed. Will move to Accepted once `feat-003-chaincode-domain-model` lands.

## Context

The audit trail registers a multi-step lifecycle of a game session: initiation, intermediate checkpoints, finalization. Two natural data shapes:

- A single `GameSession` aggregate with a `events: SessionEvent[]` array stored together
- A `GameSession` aggregate **referenced by** independent `SessionEvent` records, each persisted separately on the ledger

GalaChain's underlying ledger (Hyperledger Fabric) is key-value with composite keys; the access patterns matter more than they would on a relational store.

## Decision

Split `GameSession` and `SessionEvent` into two ChainObjects with distinct composite keys:

- `GameSession` keyed on `sessionId`
- `SessionEvent` keyed on `(sessionId, sequence)` so events of a single session are co-located and orderable

`GameSession` stays the aggregate root for invariants (status transitions, player authorization, outcome immutability). Events are entities inside that aggregate but persisted as independent records.

## Alternatives considered

- **Single-aggregate (events as embedded array)** — simpler reads, but every checkpoint append rewrites the entire session record. Rejected: state size grows unbounded with checkpoint count, and concurrent appends become serialization-prone.
- **Event-sourced (no `GameSession` materialization, derived from events)** — pure but requires replay on every read. Rejected: chaincode reads should be O(1) for the common case ("get current status").

## Consequences

- Two `getObjectByKey` calls in some flows; mitigated by composite key locality on Fabric.
- Repository wrapper needs two read paths (`findSession`, `findEventsBySession`); both wrap SDK throws into `Result<Option<T>, InfraError>` per the playbook.
- Hash chain (linking each event to the previous) is computed on append and stored on `SessionEvent.prevHash`.

## Links

- [`docs/sdds/sdd-audit-trail-aggregate.md`](../sdds/sdd-audit-trail-aggregate.md)
- [`docs/adrs/0002-event-sequencing.md`](./0002-event-sequencing.md)
