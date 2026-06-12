import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles, ShieldCheck, LogOut, User as UserIcon, Menu } from "lucide-react";
import assistantImg from "@/assets/assistant.png";
import logo from "@/assets/logo.png";
import { ChatPanel } from "@/components/ChatPanel";
import { PackageResults } from "@/components/PackageResults";
import { PackageDetail } from "@/components/PackageDetail";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        <PackageResults packages={packages} onSelect={setSelected} onBack={() => setPackages([])} />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="w-full max-w-full overflow-x-hidden">
        <section className="relative w-full max-w-full overflow-hidden bg-gradient-soft-sky px-5 pt-4 pb-12 text-center sm:px-10 sm:pt-10 sm:pb-28">
          <div className="mx-auto max-w-[1440px]">
            <div className="mx-auto flex h-24 w-24 relative items-center justify-center rounded-full bg-white shadow-soft">
              <img
                src={assistantImg}
                alt="KI-Reiseassistentin"
                className="h-20 w-20 select-none object-contain"
              />
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-[#16a34a] ring-2 ring-white" />
            </div>
            <h1
              className="mt-6 font-bold leading-tight text-primary"
              style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}
            >
              Hi! Ich bin dein <span className="text-[#16a34a]">KI-Reiseassistent</span> <span aria-hidden>👋</span>
            </h1>
            <p
              className="mx-auto mt-3 max-w-md text-muted-foreground"
              style={{ fontSize: "clamp(0.875rem, 1.6vw, 1rem)" }}
            >
              Ich helfe dir, deinen perfekten Urlaub in nur wenigen Minuten zu finden — Flüge, Hotels und Aktivitäten in
              einem Paket.
            </p>

            <div className="mt-8 flex w-full max-w-full justify-center gap-6 pb-2 sm:gap-3 sm:overflow-visible sm:pb-0">
              <FeatureChip icon={Sparkles} iconColor="text-yellow-500 bg-yellow-500/10" title="Einfach" body="Wenige Fragen" />
              <FeatureChip icon={ShieldCheck} iconColor="text-pink-500 bg-pink-500/10" title="Persönlich" body="Für dich gemacht" />
              <FeatureChip icon={Check} iconColor="text-yellow-500 bg-yellow-500/10" title="Top bewertet" body="Echte Bewertungen" />
            </div>
          </div>
        </section>

        <section className="relative -mt-8 w-full max-w-full px-5 pb-10 sm:-mt-20 sm:px-10">
          <div className="mx-auto max-w-[1100px]">
            <ChatPanel onPackagesReady={setPackages} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function FeatureChip({
  icon: Icon,
  iconColor,
  title,
  body,
}: {
  icon: typeof Check;
  iconColor?: string;
  title: string;
  body: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Mobile: compact icon circle ── */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex sm:hidden flex-col items-center gap-1.5 transition-all duration-300 ${open ? "scale-105" : ""}`}
      >
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-soft border border-border transition-all duration-300 ${
            open ? "ring-2 ring-primary/40 scale-110" : ""
          } ${iconColor || "bg-primary/10 text-primary"}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <span className="text-[11px] font-semibold text-foreground">{title}</span>
      </button>

      {/* ── Mobile: expanded detail card ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm sm:hidden animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-6 w-full max-w-xs rounded-3xl border border-border bg-card p-6 shadow-luxe animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full ${iconColor || "bg-primary/10 text-primary"}`}
              >
                <Icon className="h-8 w-8" />
              </div>
              <div className="text-lg font-bold text-foreground">{title}</div>
              <div className="text-sm text-muted-foreground leading-relaxed">{body}</div>
              <button
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full bg-primary/10 px-5 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop: original card ── */}
      <div className="hidden sm:flex w-full min-w-[160px] max-w-full shrink-0 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft sm:w-auto">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconColor || "bg-primary/10 text-primary"}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-left">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{body}</div>
        </div>
      </div>
    </>
  );
}

function SiteHeader() {
  const { user, signOut } = useAuth();
  const initial = (user?.user_metadata?.full_name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="Weltweiturlaub.de" className="h-10 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5"><LogOut className="w-4 h-4 rotate-180" /> Login</Link>
          <Link to="/register" className="text-sm font-semibold text-white bg-[#16a34a] hover:bg-green-700 px-4 py-2 rounded-full flex items-center gap-1.5"><UserIcon className="w-4 h-4" /> Register</Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
      Weltweiturlaub.de · Reise planen in 2 Minuten · Powered by Agents
    </footer>
  );
}
