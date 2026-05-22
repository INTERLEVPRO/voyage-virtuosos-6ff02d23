import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles, ShieldCheck, LogOut, User as UserIcon } from "lucide-react";
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

      <main className="mx-auto max-w-3xl px-5 py-8 lg:py-12">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-soft-sky px-5 py-8 text-center shadow-card sm:px-10 sm:py-12">
          <img
            src={assistantImg}
            alt="KI-Reiseassistentin"
            width={180}
            height={180}
            className="mx-auto h-32 w-32 select-none object-contain sm:h-40 sm:w-40"
          />
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            Hi! Ich bin dein <span className="text-primary">KI-Reiseassistent</span> <span aria-hidden>👋</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
            Ich helfe dir, deinen perfekten Urlaub in nur wenigen Minuten zu finden — Flüge, Hotels und Aktivitäten in einem Paket.
          </p>

          <div className="-mx-2 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-1 sm:justify-center sm:overflow-visible">
            <FeatureChip icon={Check} title="Einfach" body="Wenige Fragen" />
            <FeatureChip icon={Sparkles} title="Persönlich" body="Für dich gemacht" />
            <FeatureChip icon={ShieldCheck} title="Top bewertet" body="Echte Reviews" />
          </div>
        </section>

        <section className="mt-8">
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
  const { user, signOut } = useAuth();
  const initial = (user?.user_metadata?.full_name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center">
          <img
            src={logo}
            alt="Weltweiturlaub.de — Reise planen in 2 Minuten"
            className="h-12 w-auto md:h-14"
          />
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initial}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/login" className="text-muted-foreground hover:text-foreground">
                Anmelden
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-primary px-4 py-1.5 text-primary-foreground hover:opacity-90"
              >
                Registrieren
              </Link>
            </>
          )}
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
