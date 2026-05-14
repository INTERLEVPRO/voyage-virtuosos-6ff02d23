import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import heroImage from "@/assets/hero-travel.jpg";
import { ChatPanel } from "@/components/ChatPanel";
import { AgentTeam } from "@/components/AgentBadge";
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
        <PackageDetail pkg={selected} onBack={() => setSelected(null)} />
        <Footer />
      </div>
    );
  }

  if (packages.length > 0) {
    return (
      <div className="min-h-screen bg-background">
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
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Luxuriöses Reiseziel"
            width={1920}
            height={1080}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-hero" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-12 lg:pt-32 lg:pb-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-card/70 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-primary backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Reise planen in 2 Minuten · Weltweit Urlaub
            </div>
            <h1 className="mt-6 font-display text-5xl leading-[1.05] text-primary text-balance md:text-7xl">
              Deine perfekte Reise — <em className="not-italic text-accent">geplant in 2 Minuten</em>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Erzähl unserem KI-Concierge von deinem Traumurlaub. Sechs Agenten — Concierge, Research, Budget, Itinerary, Persona — entwerfen in Sekunden 3 Pakete: Basic, Medium, Premium.
            </p>
          </div>
        </div>
      </section>

      {/* Chat + Agents */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ChatPanel onPackagesReady={setPackages} />
          </div>
          <aside className="lg:col-span-2">
            <h2 className="font-display text-3xl text-primary">Das Atelier</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Jeder Agent hat eine Aufgabe — gemeinsam arbeiten sie wie ein privates Reisebüro.
            </p>
            <div className="mt-6">
              <AgentTeam />
            </div>

            <div className="mt-8 rounded-xl border border-border bg-card p-5 shadow-soft">
              <h3 className="font-display text-lg text-primary">So funktioniert's</h3>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><span className="font-medium text-foreground">1.</span> Erzähl dem Concierge deinen Traum.</li>
                <li><span className="font-medium text-foreground">2.</span> Research findet Flüge & Hotels.</li>
                <li><span className="font-medium text-foreground">3.</span> Budget erstellt Basic / Medium / Premium.</li>
                <li><span className="font-medium text-foreground">4.</span> Itinerary plant deine Tage.</li>
                <li><span className="font-medium text-foreground">5.</span> Wähle dein Paket & buche direkt.</li>
              </ol>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
      Weltweit Urlaub · Reise planen in 2 Minuten · Powered by Lovable AI
    </footer>
  );
}
