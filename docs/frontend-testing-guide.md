# Frontend testing guide — FEAT-005

> What to click through tomorrow to confirm the showcase frontend works end-to-end.

## 0. Bring the app up

From the repo root:

```bash
bun install            # if dependencies aren't there yet
bun run --filter @gala-audit-trail/frontend dev
# or, equivalently:
cd apps/frontend && bun run dev
```

Open <http://localhost:3000/>.

The app ships in **mock mode by default** — no chaincode, no MetaMask. State lives in `localStorage` under key `gala-audit-trail:mock-chain:v1`. Everything you do persists across page reloads.

If something looks stuck, the **Reset chain** button on the landing page wipes the mock state.

## 1. Connect — three identities

On `/`, the *Connect* card shows three mock identities:

- **Studio** — `client|studio-mock` — can `Initiate` and `Finalize`.
- **Alice** — `client|alice-mock` — player, can `AppendCheckpoint`.
- **Bob** — `client|bob-mock` — player, can `AppendCheckpoint`.

The header pill (top right) shows who's connected. Switch between them at any time — switching is instant and re-renders all gated buttons accordingly.

> **What to verify:** the header updates, the *current* badge moves to the picked identity, the **New** button enables once anyone is connected.

## 2. Happy path — initiate → 2× checkpoint → finalize → verify

1. Connect as **Studio**.
2. Click **New** → form pre-fills a random UUID, game name, and two players. Leave the defaults and **Initiate**.
3. You land on `/session/<uuid>` with status `INITIATED`. The timeline is empty.
4. Switch the wallet to **Alice** (top of `/` or in another tab — the disconnect / reconnect updates everywhere).
5. Back on the session page, hit **Append**. The timeline shows event #1 (`CHECKPOINT`, signed by Alice, `prevHash` = 64 zeros). Session badge flips to `IN_PROGRESS`.
6. Switch to **Bob**. **Append** again. Event #2 appears with a non-zero `prevHash` (linked to event #1).
7. Switch back to **Studio**. The **Finalize** button is now enabled (only the studio can call it). Click it.
8. Session badge flips to `COMPLETED`; a final event of type `SESSION_COMPLETED` appears with the random outcome hash.
9. Click **Verify** → toast says *Verdict: Valid (3 events).* The verifier card mirrors that with a green check.

> **What to verify:** every state transition reflects in the UI immediately. The button gating (`Append` disabled when not authorized, `Finalize` disabled for non-studio) works without page reloads.

## 3. Edge — tamper → re-verify

After running the happy path:

1. Click **Tamper (demo)** on the verifier card. Toast warns *Event #2 corrupted*.
2. Click **Verify** → toast switches to *Verdict: Tampered at #2.* The verifier card shows a red shield + reason (`prevHash mismatch at sequence 3` — corrupting #2 breaks the link from #3 forward).

This proves the chain detects mutation **after** the data was written.

> **What to verify:** the verdict actually changes from Valid → Tampered when state is corrupted. Reset the chain afterwards to start fresh.

## 4. Edge — unauthorized signer

1. Reset chain. Connect as **Studio** and **Initiate** a new session — but in the players field, leave **only** Alice (delete Bob from the comma-separated list).
2. Initiate.
3. Switch to **Bob**. The **Append** button should be **disabled** (button-level gating).
4. To force the chain-level check, connect as anybody else and try to append via DevTools (or change Alice to a third identity in the players list and try with Bob) — the chain returns `FORBIDDEN` with a banner: *Chain rejected the call (FORBIDDEN). Signer client|bob-mock not authorized…*

> **What to verify:** both the UI button gate and the chain-level rejection work, and the `ErrorBanner` renders a clean message (no raw object dump).

## 5. Edge — append-after-complete / double-finalize

After finalizing a session:

1. Try to **Append** again (any identity). The chain returns `CONFLICT` — banner shows *Session ... is already completed*.
2. The **Finalize** button is disabled in the UI when status is `COMPLETED`, but if you tried to call it twice you'd get the same `CONFLICT`.

> **What to verify:** the same error mappings the on-chain contract returns (FEAT-004 G7 covered exactly these) propagate through the UI cleanly.

## 6. Off-chain verifier — Rust CLI

Independent of the frontend, you can prove the verifier CLI works end-to-end. Generate a fixture directory:

```bash
# In another terminal, after running the happy-path flow in the UI:
# Export the mock state to events.json + session.json (manual for now — see TODO).
# Or, simpler: hand-craft a fixture matching the chaincode shapes (see
# apps/audit-verifier/tests/tampering.rs for the format).
cargo run -p audit-verifier --release -- \
  verify --session-id <uuid> --source ./path/to/dir
```

It returns a proof JSON. Exit code is `0` whether the verdict is Valid or Tampered (Tampered is *the answer*, not a failure).

`dto-signer` can sign a one-off DTO for debugging:

```bash
echo '{"dto":{"x":1},"privateKeyHex":"0101...01"}' | cargo run -p dto-signer --quiet
```

(Full demo invocations live in `docs/deployment.md`.)

## 7. Things that intentionally don't work yet

- **`NEXT_PUBLIC_USE_REAL_CHAIN=1`** — the seam exists in `lib/galachain-client.ts` but the real `@gala-chain/connect` wiring is a follow-up (depends on resolving OQ-03 + having a deployed chaincode). Trying it returns *Real chain mode not wired yet*.
- **`NEXT_PUBLIC_USE_REAL_WALLET=1`** — MetaMask integration via the EIP-1193 path is in `wallet-adapter.ts::connectReal`, but the UI only invokes `connectMock` from the landing buttons. Wiring a "Connect with MetaMask" button is a 10-line follow-up once we have a real chain to talk to.
- **Live export of mock state** — there isn't a button to dump `localStorage` into the `session.json` / `events.json` shape the Rust verifier consumes. Easy to add but not blocking the showcase narrative.

## 8. Browser DevTools things worth knowing

- All app state lives at `localStorage.getItem('gala-audit-trail:mock-chain:v1')` — JSON-parseable.
- The connected wallet is at `localStorage.getItem('gala-audit-trail:wallet:v1')`.
- Clear both with `localStorage.clear()` or hit the **Reset chain** button on `/`.
- Console errors are expected to be empty during normal flows. If you see them, drop me the screenshot.

## 9. What "passing" looks like

Tomorrow, the showcase is *passing* the frontend gate if:

- [ ] All 3 routes (`/`, `/session/new`, `/session/<uuid>`) load without console errors.
- [ ] The happy path produces `Valid` from the verifier.
- [ ] **Tamper** flips the verdict to `Tampered` with a specific reason.
- [ ] Identity switching gates the buttons correctly (Append/Finalize).
- [ ] At least one error path (e.g., `FORBIDDEN`, `CONFLICT`) shows a clean banner.
- [ ] The Rust verifier CLI emits a proof JSON for a hand-crafted fixture.

Anything that doesn't match → screenshot + bug, we patch.
