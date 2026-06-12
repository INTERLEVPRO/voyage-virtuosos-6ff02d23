import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/buchen")({
  component: BuchenPage,
});

function BuchenPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50 text-foreground transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">Booking</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-5 sm:p-8">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-10 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#0d9e4f]/10 text-[#0d9e4f]">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="mb-4 text-2xl font-bold text-foreground">Ready to Book</h2>
          <p className="mb-8 text-muted-foreground">
            Your booking details will be processed here. Please confirm your travel package.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:opacity-90"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </main>
    </div>
  );
}
