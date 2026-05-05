---
id: FEAT-005
slug: frontend-bootstrap
status: planned
depends-on: [FEAT-002, FEAT-004]
blocks: []
---

# FEAT-005 — Frontend (Next.js + `@gala-chain/connect`)

## Goal

Build the Next.js demo frontend per [`ADR-0004`](../../docs/adrs/0004-frontend-architecture.md). End-to-end flow: connect wallet → initiate session → append 2-3 checkpoints → finalize → verify (on-chain) → trigger off-chain verifier display.

## Acceptance criteria

- [ ] `apps/frontend/` — Next.js 14+ App Router, Tailwind CSS, configured with `@gala-audit-trail/result-helpers/globals-types` in tsconfig + side-effect import in `app/layout.tsx`
- [ ] `lib/wallet-adapter.ts` — wraps `BrowserConnectClient`. Every method returns `Result<T, ClientError>`. **`try/catch` lives here only.**
- [ ] `lib/galachain-client.ts` — wraps `@gala-chain/connect`. Same pattern.
- [ ] `errors/client-error.ts` — `ClientError` const-object-as-enum + `EnumValues<typeof X>`
- [ ] Pages:
  - [ ] `/` — landing + connect wallet
  - [ ] `/session/new` — initiate session form
  - [ ] `/session/[id]` — view session timeline + buttons (append checkpoint, finalize, verify, trigger off-chain verifier)
- [ ] Loading / error / success states handled in all flows via `match`, not `try/catch`
- [ ] Mobile-responsive (basic, not pixel-perfect)
- [ ] Manually tested end-to-end against local chaincode

## Scope

**In:** the three pages, the two adapters, error type, basic styling.
**Out:** TNT deployment (in deployment.md), the verifier itself (separate epic).

## Open questions

- Confirm `BrowserConnectClient` works with Next.js Server Components boundary. Likely needs `'use client'` boundary at the top of wallet pages.

## Branch

`feat/frontend-bootstrap`.
