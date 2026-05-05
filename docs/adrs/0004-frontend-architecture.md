---
id: ADR-0004
title: Frontend architecture
status: proposed
date: 2026-05-05
---

# ADR-0004 — Frontend architecture

## Status

Proposed.

## Context

The frontend has three jobs:

1. Connect a wallet (MetaMask) and let the user sign DTOs.
2. Submit transactions to the chaincode and read state.
3. Trigger / display off-chain verification.

The Result/Option discipline in [`playbook.md`](../playbook.md) applies on the frontend just as much as on the chaincode. `@gala-chain/connect` and `BrowserConnectClient` can throw — we wrap them.

## Decision

**Stack:**
- Next.js 16+ with App Router
- **Tailwind CSS v4** (CSS-first config, no `tailwind.config.js` — uses `@theme` directive)
- **shadcn/ui** (Radix UI primitives + Tailwind v4) installed via `bunx shadcn@latest init`. Copy-paste components live under `apps/frontend/components/ui/`. Lets the frontend ship in 1 day instead of 3.
- `@gala-chain/connect` for chaincode I/O
- `BrowserConnectClient` for MetaMask integration

**Server-side rendering vs client-side:**
- Pages that are wallet-bound (initiate session, view session, append checkpoint) are **client-side** — wallet state lives in the browser.
- Listing / read-only pages can be Server Components with data fetched at request time.

**Wallet state:** lives in client-side React context. `Option<Wallet>` in shape (`None` until connected). No global store unless the app grows past 3-4 features (it won't for this scope).

**Adapters around third-party libs:**
- `apps/frontend/lib/wallet-adapter.ts` wraps `BrowserConnectClient` calls. Every method returns `Result<T, ClientError>`. `try/catch` lives **only here**.
- `apps/frontend/lib/galachain-client.ts` wraps `@gala-chain/connect` calls. Same pattern.

**Error handling:** route handlers and Server Actions consume adapter `Result`s with `match` and surface user-facing messages. No `try/catch` outside the two adapters.

**`ClientError` shape:** const-object-as-enum + `EnumValues<typeof X>` (per playbook).

## Alternatives considered

- **Vite + React (no Next)** — simpler bundle, but loses Server Components and Vercel deploy ergonomics. Kept Next for showcase polish.
- **Zustand or Jotai for wallet state** — not needed for 3 pages. React context is enough.
- **Client-side `try/catch` everywhere with toast notifications** — quicker, but breaks the Result discipline. Rejected.
- **Custom components from scratch (or just unstyled HTML + Tailwind)** — costs 2–3 days for zero narrative gain; shadcn/ui ships accessible Radix primitives with copy-paste ownership of the code. Aligned with the author's stack on MyApprofile (`packages/ui`).
- **Mantine / Chakra / Material UI** — runtime CSS-in-JS adds bundle weight; shadcn/ui's static-CSS approach via Tailwind v4 is faster to deploy and easier to customize per-component. Rejected.

## Consequences

- Wallet adapter is a chokepoint — bugs there leak into every flow. Tested with `bun test` mocking `BrowserConnectClient`.
- Server Components can't directly call wallet code; we route wallet ops through `'use client'` boundaries.

## Links

- [`docs/playbook.md`](../playbook.md) — Result/Option, error shapes, anti-patterns
- [`docs/adrs/0005-result-type-domain-boundary.md`](./0005-result-type-domain-boundary.md)
