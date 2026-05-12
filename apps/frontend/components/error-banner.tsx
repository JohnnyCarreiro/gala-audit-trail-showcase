"use client";

import "@gala-audit-trail/result-helpers/globals";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ClientError } from "@/errors/client-error";

/**
 * Pretty-print a `ClientError`. Single `match` over the const-enum
 * variants — never falls back to `err.toString()`, which would dump the
 * raw object payload and look amateur.
 */
function describe(err: ClientError): { title: string; detail?: string } {
  return match(err, {
    WalletCancelled: () => ({ title: "Wallet request cancelled." }),
    WalletUnavailable: () => ({
      title: "No browser wallet detected.",
      detail: "Install MetaMask (or use mock mode) and refresh.",
    }),
    ChainNetworkError: ({ message }) => ({
      title: "Chain network error.",
      detail: message,
    }),
    ChainReturnedError: ({ errorKey, message }) => ({
      title: `Chain rejected the call (${errorKey}).`,
      detail: message,
    }),
    SessionNotFound: ({ sessionId }) => ({
      title: "Session not found.",
      detail: `No record of session ${sessionId} on the chain.`,
    }),
    InvalidInput: ({ field, reason }) => ({
      title: `Invalid ${field}.`,
      detail: reason,
    }),
  });
}

export function ErrorBanner({ error }: { error: ClientError }) {
  const { title, detail } = describe(error);
  return (
    <Card className="border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/5">
      <CardContent className="pt-6 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-[var(--color-destructive)] shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{title}</span>
          {detail ? (
            <span className="text-sm text-[var(--color-muted-foreground)]">{detail}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
