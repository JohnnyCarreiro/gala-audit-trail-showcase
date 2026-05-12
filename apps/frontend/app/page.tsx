"use client";

import "@gala-audit-trail/result-helpers/globals";
import { ArrowRight, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listMockSessions, type MockSession, resetMockChain } from "@/lib/galachain-client";
import {
  type ConnectedWallet,
  connectMock,
  MOCK_IDENTITIES,
  readConnectedWallet,
} from "@/lib/wallet-adapter";

type Preset = keyof typeof MOCK_IDENTITIES;
const PRESETS: ReadonlyArray<{ key: Preset; label: string; hint: string }> = [
  { key: "studio", label: "Studio", hint: "can initiate and finalize sessions" },
  { key: "alice", label: "Alice", hint: "player — appends checkpoints" },
  { key: "bob", label: "Bob", hint: "player — appends checkpoints" },
];

export default function LandingPage() {
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [sessions, setSessions] = useState<MockSession[] | null>(null);

  useEffect(() => {
    const opt = readConnectedWallet();
    setWallet(opt.isSome() ? opt.value() : null);
    setSessions(listMockSessions());
  }, []);

  async function pickIdentity(preset: Preset) {
    const result = await connectMock(preset);
    match(result, {
      Ok: (w) => {
        setWallet(w);
        toast.success(`Connected as ${w.identityKey}`);
      },
      Err: () => {
        toast.error("Could not switch identity");
      },
    });
  }

  function resetChain() {
    resetMockChain();
    setSessions([]);
    toast.success("Mock chain wiped. Fresh slate.");
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <Badge variant="outline" className="self-start">
          FEAT-005 · mock mode
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          On-chain audit trail for game sessions.
        </h1>
        <p className="text-[var(--color-muted-foreground)] max-w-2xl">
          End-to-end demo: connect as a studio or player, initiate a session, append checkpoints,
          finalize, and verify the integrity of the hash chain — both on-chain (via this UI) and
          off-chain (via the Rust <code className="font-mono text-sm">audit-verifier</code> CLI).
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Connect</CardTitle>
          <CardDescription>
            Pick a mock identity. Switch any time. Set
            <code className="font-mono text-sm mx-1">NEXT_PUBLIC_USE_REAL_WALLET=1</code>
            to wire MetaMask instead.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {PRESETS.map((p) => {
            const isCurrent = wallet?.identityKey === MOCK_IDENTITIES[p.key].identityKey;
            return (
              <Button
                key={p.key}
                variant={isCurrent ? "default" : "outline"}
                className="justify-start h-auto py-3"
                onClick={() => pickIdentity(p.key)}
              >
                <div className="flex flex-col items-start text-left flex-1">
                  <span className="font-medium">{p.label}</span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {MOCK_IDENTITIES[p.key].identityKey} — {p.hint}
                  </span>
                </div>
                {isCurrent ? <Badge variant="success">current</Badge> : null}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Sessions</CardTitle>
            <CardDescription>Click any session to open its timeline.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetChain}>
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset chain</span>
            </Button>
            <Button asChild size="sm" disabled={!wallet}>
              <Link href="/session/new">
                <Plus className="h-4 w-4" />
                New
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sessions === null ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No sessions yet — initiate one to get started.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--color-border)] -my-2">
              {sessions.map((s) => (
                <li key={s.sessionId} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <Link
                      href={`/session/${s.sessionId}`}
                      className="font-mono text-sm truncate hover:underline underline-offset-2"
                    >
                      {s.sessionId}
                    </Link>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      {s.gameId} · studio {s.studioSigner} · {s.players.length} player(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        s.status === "COMPLETED"
                          ? "success"
                          : s.status === "IN_PROGRESS"
                            ? "default"
                            : "outline"
                      }
                    >
                      {s.status}
                    </Badge>
                    <Link
                      href={`/session/${s.sessionId}`}
                      aria-label="Open session"
                      className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        {!wallet ? (
          <CardFooter>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Pick an identity above to enable session actions.
            </p>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}
