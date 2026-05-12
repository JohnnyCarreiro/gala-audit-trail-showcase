"use client";

import { ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type ConnectedWallet, clearWallet, readConnectedWallet } from "@/lib/wallet-adapter";

/**
 * Header bar — shows the currently-connected mock identity and offers
 * a disconnect / mode label. Mounted in `app/layout.tsx`.
 */
export function WalletStatus() {
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);

  useEffect(() => {
    const refresh = () => {
      const opt = readConnectedWallet();
      setWallet(opt.isSome() ? opt.value() : null);
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-card)] sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <ShieldCheck className="h-5 w-5 text-[var(--color-primary)]" />
          <span className="font-semibold tracking-tight group-hover:opacity-80">
            Gala Audit Trail
          </span>
          <Badge variant="outline" className="ml-1 hidden sm:inline-flex">
            showcase
          </Badge>
        </Link>
        {wallet ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-end leading-tight">
              <span className="text-xs text-[var(--color-muted-foreground)] hidden sm:block">
                connected as
              </span>
              <span className="font-mono text-sm">{wallet.identityKey}</span>
            </div>
            <Badge variant={wallet.mode === "mock" ? "warning" : "success"}>{wallet.mode}</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearWallet();
                setWallet(null);
              }}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Link
            href="/"
            className="text-sm text-[var(--color-muted-foreground)] flex items-center gap-1"
          >
            <Wallet className="h-4 w-4" /> not connected
          </Link>
        )}
      </div>
    </header>
  );
}
