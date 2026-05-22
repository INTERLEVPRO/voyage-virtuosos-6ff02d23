import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles, ShieldCheck, LogOut, User as UserIcon, Palmtree, Building2, Heart } from "lucide-react";
import assistantImg from "@/assets/assistant.png";
import logo from "@/assets/logo.png";
import mallorcaImg from "@/assets/insp-mallorca.jpg";
import lissabonImg from "@/assets/insp-lissabon.jpg";
import baliImg from "@/assets/insp-bali.jpg";
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

type Inspiration = {
  id: string;
  title: string;
  meta: string;
  img: string;
  icon: typeof Palmtree;
  prompt: string;
};

const INSPIRATIONS: Inspiration[] = [
  {
    id: "mallorca",
    title: "Exklusives Mallorca Finca-Erlebnis",
    meta: "7 Tage, 2 Pers., Privat-Finca, Gourmet-Abendessen, Abflug FRA",
    img: mallorcaImg,
    icon: Palmtree,
    prompt:
      "Mallorca, 7 Tage, 2 Personen, exklusive Privat-Finca mit Gourmet-Abendessen, Abflug Frankfurt, gehobenes Budget",
  },
  {
    id: "lissabon",
    title: "Kultur & Kulinarik in Lissabon",
    meta: "4 Tage, 1200€, Boutique-Hotel, Fine Dining, Abflug MUC",
    img: lissabonImg,
    icon: Building2,
    prompt:
      "Städtetrip Lissabon, 4 Tage, 1200€, Boutique-Hotel, Kunst & Fine Dining, Abflug München",
  },
  {
    id: "bali",
    title: "Ultimatives Bali Honeymoon-Paket",
    meta: "10 Tage, 5000€, Private Pool Villa, Spa-Behandlungen, Abflug BER",
    img: baliImg,
    icon: Heart,
    prompt:
      "Bali Honeymoon, 10 Tage, 5000€, Private Pool Villa, Spa-Behandlungen, Abflug Berlin",
  },
];

function Index() {
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [selected, setSelected] = useState<TravelPackage | null>(null);
  const [chatPrompt, setChatPrompt] = useState<string | null>(null);

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
          onBack={() => {
            setPackages([]);
            setChatPrompt(null);
          }}
        />
        <Footer />
      </div>
    );
  }

  if (chatPrompt !== null) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <button
            onClick={() => setChatPrompt(null)}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Zurück zur Startseite
          </button>
          <ChatPanel
            onPackagesReady={setPackages}
            autoSendPrompt={chatPrompt || undefined}
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-6 py-8 lg:py-10">
        {/* Centered logo hero */}
        <div className="flex justify-center pb-8">
          <img
            src={logo}
            alt="Weltweiturlaub.de — Reise planen in 2 Minuten"
            className="h-24 w-auto md:h-32 lg:h-40"
          />
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_1fr]">
          {/* Left: assistant + greeting */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-soft-sky p-6 shadow-card md:p-8">
            <div className="flex justify-center">
              <div className="overflow-hidden rounded-2xl shadow-card ring-1 ring-border">
                <img
                  src={assistantImg}
                  alt="KI-Reiseassistentin"
                  width={360}
                  height={360}
                  className="h-56 w-56 object-cover md:h-72 md:w-72"
                />
              </div>
            </div>

            <div className="mt-6">
              <h1 className="text-3xl leading-tight text-foreground md:text-4xl">
                Hi! Ich bin dein Weltweit <span className="text-primary">KI-Reiseplaner</span>
              </h1>
              <p className="mt-3 text-sm text-muted-foreground md:text-base">
                Gestalte deinen exklusiven Urlaub in Sekunden — Flug, Hotel, Events in einem kuratierten Paket.
              </p>

              <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
                <Feature icon={Check} title="Unkompliziert" />
                <Feature icon={Sparkles} title="Maßgeschneidert" />
                <Feature icon={ShieldCheck} title="Exzellente Bewertungen" />
              </div>

              <button
                onClick={() => setChatPrompt("")}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02]"
              >
                <Sparkles className="h-4 w-4" /> Eigene Reise planen
              </button>
            </div>
          </section>

          {/* Right: inspirations */}
          <section className="rounded-3xl border border-border bg-card p-6 shadow-card md:p-7">
            <h2 className="mb-5 text-2xl font-semibold text-foreground">
              Was inspiriert dich heute?
            </h2>

            <div className="flex flex-col gap-3">
              {INSPIRATIONS.map((insp) => (
                <button
                  key={insp.id}
                  onClick={() => setChatPrompt(insp.prompt)}
                  className="group flex items-stretch gap-4 rounded-2xl border border-border bg-background p-3 text-left transition-all hover:border-primary/40 hover:shadow-soft"
                >
                  <img
                    src={insp.img}
                    alt={insp.title}
                    loading="lazy"
                    width={640}
                    height={512}
                    className="h-20 w-28 flex-shrink-0 rounded-xl object-cover md:h-24 md:w-32"
                  />
                  <div className="flex flex-1 flex-col justify-center pr-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground md:text-base">
                        {insp.title}
                      </h3>
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <insp.icon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                      {insp.meta}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
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
}: {
  icon: typeof Check;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-xs font-semibold text-foreground">{title}</div>
    </div>
  );
}

function SiteHeader() {
  const { user, signOut } = useAuth();
  const initial = (user?.user_metadata?.full_name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center">
          <img
            src={logo}
            alt="Weltweiturlaub.de"
            className="h-10 w-auto md:h-12"
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
