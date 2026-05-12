"use client";

import "@gala-audit-trail/result-helpers/globals";
import {
  ArrowLeft,
  CheckCircle2,
  Flag,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  Skull,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorBanner } from "@/components/error-banner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClientError } from "@/errors/client-error";
import { ClientError as ClientErrorEnum } from "@/errors/client-error";
import {
  appendCheckpoint,
  finalizeSession,
  getSession,
  getSessionEvents,
  type MockEvent,
  type MockSession,
  tamperWithEvent,
  type Verdict,
  verifyIntegrity,
} from "@/lib/galachain-client";
import { type ConnectedWallet, readConnectedWallet } from "@/lib/wallet-adapter";

function randomUuidV4(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "00000000-0000-4000-8000-000000000000".replace(/[018]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "0" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function randomHashHex(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return `0x${hex}`;
}

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [session, setSession] = useState<MockSession | null>(null);
  const [events, setEvents] = useState<MockEvent[] | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState<ClientError | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [score, setScore] = useState("");

  const refresh = useCallback(async () => {
    setError(null);
    const sResult = await getSession(sessionId);
    match(sResult, {
      Ok: (s) => setSession(s),
      Err: (e) => setError(e),
    });
    const eResult = await getSessionEvents(sessionId);
    match(eResult, {
      Ok: (list) => setEvents(list),
      Err: () => setEvents([]),
    });
  }, [sessionId]);

  useEffect(() => {
    const opt = readConnectedWallet();
    setWallet(opt.isSome() ? opt.value() : null);
    refresh();
  }, [refresh]);

  async function doAppend() {
    if (!wallet) {
      setError(ClientErrorEnum.WalletUnavailable());
      return;
    }
    setPending("append");
    setError(null);
    const parsed = score ? Number(score) : Math.floor(Math.random() * 100);
    const result = await appendCheckpoint({
      sessionId,
      eventId: randomUuidV4(),
      payload: { score: parsed, by: wallet.identityKey, ts: Date.now() },
      signedBy: wallet.identityKey,
    });
    setPending(null);
    match(result, {
      Ok: () => {
        toast.success("Checkpoint appended");
        setScore("");
        setVerdict(null);
        refresh();
      },
      Err: (e) => setError(e),
    });
  }

  async function doFinalize() {
    if (!wallet) {
      setError(ClientErrorEnum.WalletUnavailable());
      return;
    }
    setPending("finalize");
    setError(null);
    const result = await finalizeSession({
      sessionId,
      eventId: randomUuidV4(),
      outcomeHash: randomHashHex(),
      signedBy: wallet.identityKey,
    });
    setPending(null);
    match(result, {
      Ok: () => {
        toast.success("Session finalized");
        setVerdict(null);
        refresh();
      },
      Err: (e) => setError(e),
    });
  }

  async function doVerify() {
    setPending("verify");
    setError(null);
    const result = await verifyIntegrity(sessionId);
    setPending(null);
    match(result, {
      Ok: (v) => {
        setVerdict(v);
        if (v.kind === "valid") {
          toast.success(`Verdict: Valid (${v.eventsVerified} events).`);
        } else {
          toast.warning(`Verdict: Tampered at #${v.tamperedAt}.`);
        }
      },
      Err: (e) => setError(e),
    });
  }

  async function doTamper() {
    setPending("tamper");
    setError(null);
    const result = await tamperWithEvent(sessionId);
    setPending(null);
    match(result, {
      Ok: () => {
        toast.warning("Event #2 corrupted. Run Verify to see the verdict change.");
        refresh();
      },
      Err: (e) => setError(e),
    });
  }

  const canAppend =
    !!wallet &&
    !!session &&
    session.status !== "COMPLETED" &&
    new Set([session.studioSigner, ...session.players]).has(wallet.identityKey);
  const canFinalize =
    !!wallet &&
    !!session &&
    session.status !== "COMPLETED" &&
    wallet.identityKey === session.studioSigner;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/"
        className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] inline-flex items-center gap-1 self-start"
      >
        <ArrowLeft className="h-4 w-4" /> back
      </Link>

      {/* Header card */}
      {session === null ? (
        <Skeleton className="h-32 rounded-lg" />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex flex-col gap-1.5 min-w-0">
                <CardTitle>
                  <span className="font-mono text-base truncate block">{session.sessionId}</span>
                </CardTitle>
                <CardDescription>
                  game <span className="font-mono">{session.gameId}</span> · studio{" "}
                  <span className="font-mono">{session.studioSigner}</span> ·
                  {session.players.length} player(s)
                </CardDescription>
              </div>
              <Badge
                variant={
                  session.status === "COMPLETED"
                    ? "success"
                    : session.status === "IN_PROGRESS"
                      ? "default"
                      : "outline"
                }
                className="self-start"
              >
                {session.status}
              </Badge>
            </div>
          </CardHeader>
          {session.outcomeHash ? (
            <CardContent>
              <span className="text-xs text-[var(--color-muted-foreground)]">outcome hash</span>
              <p className="font-mono text-xs break-all">{session.outcomeHash}</p>
            </CardContent>
          ) : null}
        </Card>
      )}

      {error ? <ErrorBanner error={error} /> : null}

      {/* Action grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> Append checkpoint
            </CardTitle>
            <CardDescription>
              Signs as <span className="font-mono">{wallet?.identityKey ?? "—"}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Label htmlFor="score">Score (optional)</Label>
            <Input
              id="score"
              type="number"
              placeholder="random if empty"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </CardContent>
          <CardFooter>
            <Button
              onClick={doAppend}
              disabled={!canAppend || pending === "append"}
              className="w-full"
            >
              {pending === "append" ? "Appending…" : "Append"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Flag className="h-4 w-4" /> Finalize
            </CardTitle>
            <CardDescription>Studio-only. Generates a random outcome hash.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Connect as the studio identity to enable.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              variant="success"
              onClick={doFinalize}
              disabled={!canFinalize || pending === "finalize"}
              className="w-full"
            >
              {pending === "finalize" ? "Finalizing…" : "Finalize"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Verifier card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Integrity verifier
          </CardTitle>
          <CardDescription>
            On-chain verifier walks the hash chain and signer-authorization rules. (Off-chain Rust
            verifier is available via{" "}
            <code className="font-mono text-xs">cargo run -p audit-verifier</code>
            .)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {verdict ? (
            verdict.kind === "valid" ? (
              <div className="flex items-start gap-2 text-[var(--color-success)]">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Valid</p>
                  <p className="text-sm">
                    {verdict.eventsVerified} event(s) verified — every link in the chain is
                    consistent.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-[var(--color-destructive)]">
                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Tampered</p>
                  <p className="text-sm">
                    {verdict.eventsVerified} verified before stopping at event #{verdict.tamperedAt}
                    .
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                    Reason: {verdict.reason}
                  </p>
                </div>
              </div>
            )
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No verification run yet.</p>
          )}
        </CardContent>
        <CardFooter className="justify-between gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={doTamper}
            disabled={(events?.length ?? 0) < 2 || pending === "tamper"}
          >
            <Skull className="h-4 w-4" /> Tamper (demo)
          </Button>
          <Button onClick={doVerify} disabled={pending === "verify"}>
            {pending === "verify" ? "Verifying…" : "Verify"}
          </Button>
        </CardFooter>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event timeline</CardTitle>
          <CardDescription>
            Ordered by <code className="font-mono">sequence</code>, oldest first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events === null ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">No events yet.</p>
          ) : (
            <ol className="flex flex-col divide-y divide-[var(--color-border)] -my-3">
              {[...events]
                .sort((a, b) => a.sequence - b.sequence)
                .map((ev) => (
                  <li key={ev.eventId} className="py-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{ev.sequence}</Badge>
                        <Badge
                          variant={ev.eventType === "SESSION_COMPLETED" ? "success" : "default"}
                        >
                          {ev.eventType}
                        </Badge>
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          by <span className="font-mono">{ev.signedBy}</span>
                        </span>
                      </div>
                      <span className="text-xs text-[var(--color-muted-foreground)] font-mono">
                        {ev.timestamp}
                      </span>
                    </div>
                    <div className="text-xs font-mono break-all bg-[var(--color-muted)] p-2 rounded-md">
                      <span className="text-[var(--color-muted-foreground)]">payload:</span>{" "}
                      {JSON.stringify(ev.payload)}
                    </div>
                    <div className="text-xs font-mono text-[var(--color-muted-foreground)] truncate">
                      prevHash: {ev.prevHash}
                    </div>
                  </li>
                ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
