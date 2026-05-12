"use client";

import "@gala-audit-trail/result-helpers/globals";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorBanner } from "@/components/error-banner";
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
import type { ClientError } from "@/errors/client-error";
import { ClientError as ClientErrorEnum } from "@/errors/client-error";
import { initiateSession } from "@/lib/galachain-client";
import { type ConnectedWallet, readConnectedWallet } from "@/lib/wallet-adapter";

function randomUuidV4(): string {
  // crypto.randomUUID is widely available; fallback for older browsers.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "00000000-0000-4000-8000-000000000000".replace(/[018]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "0" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const DEFAULT_PLAYERS = "client|alice-mock,client|bob-mock";

export default function NewSessionPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);

  const [sessionId, setSessionId] = useState(randomUuidV4());
  const [gameId, setGameId] = useState("ascension-arena");
  const [players, setPlayers] = useState(DEFAULT_PLAYERS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ClientError | null>(null);

  useEffect(() => {
    const opt = readConnectedWallet();
    setWallet(opt.isSome() ? opt.value() : null);
  }, []);

  const playerList = players
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!wallet) {
      setError(ClientErrorEnum.WalletUnavailable());
      return;
    }
    if (playerList.length === 0) {
      setError(ClientErrorEnum.InvalidInput("players", "At least one player is required"));
      return;
    }
    setSubmitting(true);
    const result = await initiateSession({
      sessionId,
      gameId,
      players: playerList,
      studioSigner: wallet.identityKey,
    });
    setSubmitting(false);
    match(result, {
      Ok: (session) => {
        toast.success("Session initiated");
        router.push(`/session/${session.sessionId}`);
      },
      Err: (e) => {
        setError(e);
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/"
        className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] inline-flex items-center gap-1 self-start"
      >
        <ArrowLeft className="h-4 w-4" /> back
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Initiate session</CardTitle>
          <CardDescription>
            The connected identity becomes the <code className="font-mono">studioSigner</code>.
          </CardDescription>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sessionId">Session ID (UUID v4)</Label>
              <div className="flex gap-2">
                <Input
                  id="sessionId"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  required
                  pattern="[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSessionId(randomUuidV4())}
                >
                  Re-roll
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gameId">Game ID</Label>
              <Input
                id="gameId"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="players">Players (comma-separated identityKeys)</Label>
              <Input
                id="players"
                value={players}
                onChange={(e) => setPlayers(e.target.value)}
                required
              />
              <span className="text-xs text-[var(--color-muted-foreground)]">
                Tip: connect as Alice or Bob in another tab to append checkpoints as them — the
                wallet identity drives `signedBy`.
              </span>
            </div>

            <div className="rounded-md bg-[var(--color-muted)] p-3 text-xs font-mono">
              <span className="text-[var(--color-muted-foreground)]">studioSigner:</span>{" "}
              {wallet?.identityKey ?? "— not connected —"}
            </div>
            {error ? <ErrorBanner error={error} /> : null}
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={!wallet || submitting}>
              {submitting ? "Initiating…" : "Initiate"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
