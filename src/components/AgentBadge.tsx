import { Brain, MessagesSquare, Search, Wallet, Map, Sparkles } from "lucide-react";

const AGENTS = [
  { icon: Brain, name: "Orchestrator", desc: "Coordinates the team" },
  { icon: MessagesSquare, name: "Concierge", desc: "Listens to your dream" },
  { icon: Search, name: "Research", desc: "Finds flights & stays" },
  { icon: Wallet, name: "Budget", desc: "Crafts 3 tiers" },
  { icon: Map, name: "Itinerary", desc: "Builds day-by-day" },
  { icon: Sparkles, name: "Persona", desc: "Tells the story" },
];

export function AgentTeam() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {AGENTS.map((a) => (
        <div
          key={a.name}
          className="group rounded-xl border border-border bg-card/60 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-soft"
        >
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-gold text-primary">
            <a.icon className="h-4 w-4" />
          </div>
          <div className="font-display text-base text-primary">{a.name}</div>
          <div className="text-xs text-muted-foreground">{a.desc}</div>
        </div>
      ))}
    </div>
  );
}
