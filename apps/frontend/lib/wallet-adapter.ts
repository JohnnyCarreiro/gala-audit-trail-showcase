"use client";

import "@gala-audit-trail/result-helpers/globals";
import { ClientError } from "@/errors/client-error";

/**
 * Wallet adapter — wraps any browser-side identity source into a
 * `Result<ConnectedWallet, ClientError>` shape. The **only place** the
 * frontend allows `try/catch`, per playbook.
 *
 * Two modes share this surface:
 *   - **Mock** (default): persists a fake `client|alice-mock` identity in
 *     `localStorage` so the demo runs offline. Fast iteration; no
 *     extension required.
 *   - **Real** (env `NEXT_PUBLIC_USE_REAL_WALLET=1`): wraps
 *     `@gala-chain/connect`'s `BrowserConnectClient` and asks MetaMask
 *     for an `eth_requestAccounts`. Resolves [`OQ-06`] empirically once
 *     a user signs their first DTO.
 *
 * [`OQ-06`]: ../../../docs/open-questions.md
 */

const WALLET_KEY = "gala-audit-trail:wallet:v1";

export interface ConnectedWallet {
  identityKey: string;
  ethAddress: string;
  mode: "mock" | "real";
}

const realWalletEnabled = (): boolean =>
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_USE_REAL_WALLET === "1";

// Three preset mock identities so the demo can swap between studio +
// player roles without re-typing. `satisfies` keeps the literal-key
// inference (so indexed access returns `ConnectedWallet`, not
// `ConnectedWallet | undefined` under `noUncheckedIndexedAccess`).
export const MOCK_IDENTITIES = {
  studio: {
    identityKey: "client|studio-mock",
    ethAddress: "0xabc0000000000000000000000000000000000001",
    mode: "mock",
  },
  alice: {
    identityKey: "client|alice-mock",
    ethAddress: "0xabc0000000000000000000000000000000000002",
    mode: "mock",
  },
  bob: {
    identityKey: "client|bob-mock",
    ethAddress: "0xabc0000000000000000000000000000000000003",
    mode: "mock",
  },
} as const satisfies Record<string, ConnectedWallet>;

export function readConnectedWallet(): Option<ConnectedWallet> {
  if (typeof window === "undefined") return None();
  const raw = window.localStorage.getItem(WALLET_KEY);
  if (!raw) return None();
  try {
    return Some(JSON.parse(raw) as ConnectedWallet);
  } catch {
    return None();
  }
}

export function clearWallet(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WALLET_KEY);
}

export async function connectMock(
  preset: keyof typeof MOCK_IDENTITIES,
): Promise<Result<ConnectedWallet, ClientError>> {
  const wallet: ConnectedWallet = MOCK_IDENTITIES[preset];
  if (typeof window !== "undefined") {
    window.localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  }
  return Ok(wallet);
}

/**
 * Real wallet connect — talks to MetaMask via the global EIP-1193
 * provider. The single `try/catch` of the entire frontend lives here.
 */
export async function connectReal(): Promise<Result<ConnectedWallet, ClientError>> {
  const provider =
    typeof window !== "undefined"
      ? (window as unknown as { ethereum?: { request: (a: unknown) => Promise<unknown> } }).ethereum
      : undefined;
  if (!provider) return Err(ClientError.WalletUnavailable());
  try {
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    const first = accounts?.[0];
    if (!first) return Err(ClientError.WalletCancelled());
    const ethAddress = first.toLowerCase();
    const wallet: ConnectedWallet = {
      identityKey: `eth|${ethAddress.slice(2)}`,
      ethAddress,
      mode: "real",
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
    }
    return Ok(wallet);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes("user rejected")) {
      return Err(ClientError.WalletCancelled());
    }
    return Err(ClientError.ChainNetworkError(message));
  }
}

export function isRealWalletMode(): boolean {
  return realWalletEnabled();
}
