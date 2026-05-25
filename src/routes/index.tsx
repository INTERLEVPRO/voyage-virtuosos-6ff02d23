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

      <main>
        <section className="relative w-full max-w-full overflow-hidden bg-gradient-soft-sky px-5 pt-8 pb-8 text-center sm:px-10 sm:pt-14 sm:pb-10">
          <img
            src={assistantImg}
            alt="KI-Reiseassistentin"
            width={180}
            height={180}
            className="mx-auto h-20 w-20 select-none object-contain sm:h-36 sm:w-36"
          />
          <h1 className="mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-4xl">
            Hi! Ich bin dein <span className="text-primary">KI-Reiseassistent</span> <span aria-hidden>👋</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
            Ich helfe dir, deinen perfekten Urlaub in nur wenigen Minuten zu finden — Flüge, Hotels und Aktivitäten in einem Paket.
          </p>

          <div className="mt-8 grid w-full max-w-full grid-cols-1 gap-3 sm:flex sm:justify-center sm:gap-3">
            <FeatureChip icon={Check} title="Einfach" body="Wenige Fragen" />
            <FeatureChip icon={Sparkles} title="Persönlich" body="Für dich gemacht" />
            <FeatureChip icon={ShieldCheck} title="Top bewertet" body="Echte Bewertungen" />
          </div>
        </section>

        <section className="w-full max-w-full px-5 pb-8 pt-6 sm:px-10 sm:pt-8">
          <ChatPanel onPackagesReady={setPackages} />
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Deine Daten sind sicher und werden nicht weitergegeben.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function FeatureChip({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Check;
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-w-[160px] snap-center items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-left">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{body}</div>
      </div>
    </div>
  );
}


function SiteHeader() {
  const { user, signOut } = useAuth();
  const initial = (user?.user_metadata?.full_name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center">
          <img
            src={logo}
            alt="Weltweiturlaub.de — Reise planen in 2 Minuten"
            className="h-10 w-auto sm:h-12 md:h-14"
          />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Menü öffnen"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {user ? (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initial}
              </span>
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {user ? (
              <>
                <DropdownMenuLabel className="truncate">
                  {user.user_metadata?.full_name || user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <UserIcon className="mr-2 h-4 w-4" /> Mein Konto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" /> Abmelden
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/login">Anmelden</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/register">Registrieren</Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
