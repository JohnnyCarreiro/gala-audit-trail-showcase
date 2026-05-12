// Side-effect import: registers `Ok` / `Err` / `Some` / `None` / `match`
// on `globalThis`. Imported once at the root so every client component
// can use the bare globals without re-importing.
import "@gala-audit-trail/result-helpers/globals";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import { WalletStatus } from "@/components/wallet-status";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gala Audit Trail",
  description:
    "On-chain audit trail for game sessions on GalaChain. Showcase: end-to-end demo with off-chain Rust verifier.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <WalletStatus />
        <main className="flex-1">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10">{children}</div>
        </main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
