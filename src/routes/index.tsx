import { createFileRoute } from "@tanstack/react-router";
import heroImage from "@/assets/hero-travel.jpg";
import { ChatPanel } from "@/components/ChatPanel";
import { AgentTeam } from "@/components/AgentBadge";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Luxury travel destination"
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
              Multi-agent AI · Weltweit Urlaub
            </div>
            <h1 className="mt-6 font-display text-5xl leading-[1.05] text-primary text-balance md:text-7xl">
              Your dream trip, <em className="not-italic text-accent">composed</em> by a team of AI agents.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Six specialized agents — concierge, research, budget, itinerary, persona —
              collaborate in seconds to craft a bespoke luxury travel proposal, just for you.
            </p>
          </div>
        </div>
      </section>

      {/* Chat + Agents */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ChatPanel />
          </div>
          <aside className="lg:col-span-2">
            <h2 className="font-display text-3xl text-primary">The atelier</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Each agent has one job — together they perform like a private travel house.
            </p>
            <div className="mt-6">
              <AgentTeam />
            </div>

            <div className="mt-8 rounded-xl border border-border bg-card p-5 shadow-soft">
              <h3 className="font-display text-lg text-primary">How it works</h3>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><span className="font-medium text-foreground">1.</span> Tell the Concierge your dream.</li>
                <li><span className="font-medium text-foreground">2.</span> Research scouts real options.</li>
                <li><span className="font-medium text-foreground">3.</span> Budget builds Essential / Signature / Bespoke.</li>
                <li><span className="font-medium text-foreground">4.</span> Itinerary maps your days.</li>
                <li><span className="font-medium text-foreground">5.</span> Persona delivers it as a story.</li>
              </ol>
            </div>
          </aside>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Weltweit Urlaub · A multi-agent AI travel atelier · Powered by Lovable AI
      </footer>
    </div>
  );
}
