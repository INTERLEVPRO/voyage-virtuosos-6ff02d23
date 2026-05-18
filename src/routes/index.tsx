import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Globe, Check, Sparkles, ShieldCheck } from "lucide-react";
import assistantImg from "@/assets/assistant.png";
import { ChatPanel } from "@/components/ChatPanel";
import { PackageResults } from "@/components/PackageResults";
import { PackageDetail } from "@/components/PackageDetail";
import type { TravelPackage } from "@/types/travel";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [selected, setSelected] = useState<TravelPackage | null>(null);

  if (selected) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <PackageDetail pkg={selected} onBack={() => setSelected(null)} />
        <Footer />
      </div>
    );
  }

  if (packages.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <PackageResults
          packages={packages}
          onSelect={setSelected}
          onBack={() => setPackages([])}
        />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-6 py-10 lg:py-16">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          {/* Left: greeting + assistant */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-soft-sky p-8 shadow-card lg:p-10">
            <div className="relative z-10 max-w-md">
              <h1 className="text-4xl leading-tight text-foreground md:text-5xl">
                Hi! Ich bin dein KI-<span className="text-primary">Reiseassistent</span> <span aria-hidden>👋</span>
              </h1>
              <p className="mt-4 text-base text-muted-foreground">
                Ich helfe dir, deinen perfekten Urlaub in nur wenigen Minuten zu finden — Flüge, Hotels und Aktivitäten in einem Paket.
              </p>

              <div className="mt-8 grid grid-cols-3 gap-3 text-xs">
                <Feature icon={Check} title="Einfach" body="Wenige Fragen" />
                <Feature icon={Sparkles} title="Persönlich" body="Für dich gemacht" />
                <Feature icon={ShieldCheck} title="Top bewertet" body="Echte Reviews" />
              </div>
            </div>

            <img
              src={assistantImg}
              alt="KI-Reiseassistentin"
              width={420}
              height={420}
              className="pointer-events-none absolute -right-6 bottom-0 hidden h-[340px] w-auto select-none object-contain md:block lg:h-[400px]"
            />
          </section>

          {/* Right: chat (replaces structured form, same workflow as before) */}
          <section>
            <ChatPanel onPackagesReady={setPackages} />
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Deine Daten sind sicher und werden nicht weitergegeben.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Check;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground">{body}</div>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Globe className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Weltweit<span className="text-primary">urlaub</span>.de
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <button className="hidden items-center gap-1 hover:text-foreground sm:inline-flex">
            DE <span className="text-xs">▾</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
      Weltweiturlaub.de · Reise planen in 2 Minuten · Powered by Lovable AI
    </footer>
  );
}
