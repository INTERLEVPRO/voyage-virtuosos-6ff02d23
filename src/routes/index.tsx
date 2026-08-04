import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Check, Sparkles, ShieldCheck, LogOut, User as UserIcon, Globe, Plane, MapPin } from "lucide-react";
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
import { Footer } from "@/components/Footer";

const HERO_PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const seed = i + 1;
  const wave = (multiplier: number, offset = 0) => {
    const value = Math.sin(seed * multiplier + offset) * 10000;
    return value - Math.floor(value);
  };
  const percent = (value: number) => `${value.toFixed(4)}%`;
  const px = (value: number) => `${value.toFixed(3)}px`;
  const seconds = (value: number) => `${value.toFixed(3)}s`;

  return {
    left: percent(10 + wave(12.9898) * 80),
    top: percent(10 + wave(78.233, 1.7) * 80),
    dx: px(-30 + wave(37.719, 0.5) * 60),
    dy: px(-40 + wave(19.371, 2.3) * 80),
    duration: seconds(4 + wave(7.113, 4.1) * 6),
    delay: seconds(-wave(3.917, 6.2) * 8),
  };
});


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Urlaub ab Deutschland planen — KI-Reiseplaner | Weltweiturlaub.de" },
      {
        name: "description",
        content:
          "Weltweite Reisen ab Deutschland in 2 Minuten planen: 3 individuelle Reisepakete mit Flügen ab Frankfurt, München, Berlin, Düsseldorf & Hamburg, Hotels und Aktivitäten — Preise in EUR.",
      },
      { property: "og:title", content: "Urlaub ab Deutschland planen — KI-Reiseplaner | Weltweiturlaub.de" },
      {
        property: "og:description",
        content:
          "Dein Reiseplaner für Deutschland: individuelle Urlaubspakete mit Flug, Hotel und Aktivitäten — in EUR, in 2 Minuten.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://weltweiturlaub.de/" },
    ],
    links: [{ rel: "canonical", href: "https://weltweiturlaub.de/" }],
  }),
  component: Index,
});


function Index() {
  const [packages, setPackages] = useState<TravelPackage[]>([]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const forceTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Immediately force top
    forceTop();
    const t1 = setTimeout(forceTop, 50);
    const t2 = setTimeout(forceTop, 150);

    // bfcache restore: mobile Chrome tab revisit (e.persisted = true)
    const handlePageShow = (e: PageTransitionEvent) => {
      forceTop();
      if (e.persisted) {
        forceTop();
        setTimeout(forceTop, 0);
        setTimeout(forceTop, 50);
        setTimeout(forceTop, 150);
        setTimeout(forceTop, 300);
      }
    };

    // Tab becomes active again
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        forceTop();
        setTimeout(forceTop, 50);
        setTimeout(forceTop, 150);
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
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
        {/* ── Premium Hero Section with animated gradient + 3D effects ── */}
        <section className="relative w-full max-w-full overflow-hidden hero-gradient-animated px-5 pt-8 pb-20 text-center sm:px-10 sm:pt-16 sm:pb-36">
          {/* Floating orbs */}
          <div className="orb w-[300px] h-[300px] bg-[#0d9e4f] top-[-50px] right-[-100px] sm:w-[500px] sm:h-[500px]" style={{ animationDelay: "0s" }} />
          <div className="orb w-[200px] h-[200px] bg-[#2196f3] bottom-[20px] left-[-80px] sm:w-[400px] sm:h-[400px]" style={{ animationDelay: "-3s" }} />
          <div className="orb w-[150px] h-[150px] bg-[#0d9e4f] top-[60%] right-[10%] sm:w-[250px] sm:h-[250px]" style={{ animationDelay: "-5s" }} />

          {/* Particles */}
          {HERO_PARTICLES.map((particle, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: particle.left,
                top: particle.top,
                ["--dx" as string]: particle.dx,
                ["--dy" as string]: particle.dy,
                ["--dur" as string]: particle.duration,
                animationDelay: particle.delay,
              }}
            />
          ))}

          <div className="relative z-10 mx-auto max-w-[1440px]">
            {/* 3D Avatar with glow ring */}
            <div className="fade-up mx-auto flex h-28 w-28 relative items-center justify-center rounded-full bg-white/10 glass glow-ring shadow-glow-green sm:h-32 sm:w-32">
              <img
                src={assistantImg}
                alt="KI-Reiseassistentin"
                className="h-24 w-24 select-none object-contain drop-shadow-lg sm:h-28 sm:w-28"
                width={112}
                height={112}
                fetchPriority="high"
                decoding="async"
              />
              <span className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-[#0d9e4f] ring-3 ring-white/30 shadow-glow-green" />
            </div>

            {/* Hero Title with gradient text */}
            <h1
              className="fade-up fade-up-delay-1 mt-8 font-bold leading-tight text-white drop-shadow-lg"
              style={{ fontSize: "clamp(1.6rem, 5vw, 3rem)" }}
            >
              Hi! Ich bin dein{" "}
              <span className="bg-gradient-to-r from-[#0d9e4f] to-[#07c963] bg-clip-text text-transparent">
                KI-Reiseassistent
              </span>{" "}
              <span aria-hidden className="inline-block animate-bounce">👋</span>
            </h1>
            <p
              className="fade-up fade-up-delay-2 mx-auto mt-4 max-w-lg text-white/80"
              style={{ fontSize: "clamp(0.9rem, 1.8vw, 1.15rem)" }}
            >
              Ich helfe dir, deinen perfekten Urlaub in nur wenigen Minuten zu finden — Flüge, Hotels und Aktivitäten in
              einem Paket.
            </p>

            {/* ── 3D Feature Icons ── */}
            <div className="fade-up fade-up-delay-3 mt-10 flex w-full max-w-full justify-center gap-6 pb-2 sm:gap-4 sm:pb-0">
              <FeatureChip icon={Sparkles} iconColor="text-yellow-300 bg-yellow-400/20" title="Einfach" body="Wenige Fragen — sofort Ergebnisse" />
              <FeatureChip icon={ShieldCheck} iconColor="text-pink-300 bg-pink-400/20" title="Persönlich" body="Maßgeschneidert für dich" />
              <FeatureChip icon={Check} iconColor="text-emerald-300 bg-emerald-400/20" title="Top bewertet" body="Echte Bewertungen & Ratings" />
            </div>

            {/* ── Animated stats bar ── */}
            <div className="fade-up fade-up-delay-4 mt-8 flex justify-center gap-6 sm:gap-10">
              <StatPill icon={Globe} value="120+" label="Reiseziele" />
              <StatPill icon={Plane} value="50K+" label="Pakete erstellt" />
              <StatPill icon={MapPin} value="4.9★" label="Bewertung" />
            </div>
          </div>

          {/* Wave divider */}
          <div className="wave-divider">
            <svg viewBox="0 0 1440 100" preserveAspectRatio="none" fill="var(--background)">
              <path d="M0,40 C360,100 720,0 1080,60 C1260,90 1380,40 1440,50 L1440,100 L0,100 Z" />
            </svg>
          </div>
        </section>

        {/* ── Chat Panel ── */}
        <section className="relative -mt-8 w-full max-w-full px-5 pb-10 sm:-mt-20 sm:px-10">
          <div className="mx-auto max-w-[1100px] fade-up fade-up-delay-4">
            <ChatPanel onPackagesReady={setPackages} />
          </div>
        </section>
        {/* ── SEO-Inhalte: Urlaub ab Deutschland ── */}
        <section className="w-full max-w-full px-5 pb-16 sm:px-10" aria-labelledby="seo-heading">
          <div className="mx-auto max-w-[1100px] space-y-8">
            <div>
              <h2 id="seo-heading" className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
                Urlaub ab Deutschland — weltweite Reisen individuell geplant
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Weltweiturlaub.de ist dein Reiseplaner für Deutschland: Du beschreibst deinen Wunschurlaub, unser
                KI-Reiseassistent stellt daraus drei komplette Reisepakete zusammen — Basic, Medium und Premium. Alle
                Preise werden in Euro (EUR) angezeigt, inklusive Flug, Hotel und passenden Aktivitäten am Zielort.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-base font-semibold text-foreground">Flüge ab deutschen Flughäfen</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Wir planen deine Reise ab deinem Wunschflughafen: Flüge ab Frankfurt, Flüge ab München, Flüge ab
                  Berlin, Flüge ab Düsseldorf und Flüge ab Hamburg. Auch Abflüge ab Köln/Bonn, Stuttgart und Hannover
                  sind möglich.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Beliebte Reiseziele weltweit</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Ob Strandurlaub auf den Malediven, Rundreise durch Sri Lanka, Städtereise nach New York, Safari in
                  Südafrika oder Inselhopping in Thailand — wir kombinieren Flug, Hotel und Erlebnisse zu einem
                  stimmigen Reisepaket.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Reiseplaner mit echten Bewertungen</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Jedes Urlaubspaket enthält Hotelbewertungen, einen Tag-für-Tag-Reiseverlauf und direkte Buchungslinks
                  — transparent und ohne Anmeldung.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Reise planen &amp; buchen</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Weiter zu{" "}
                  <Link to="/buchen" className="font-medium text-primary underline underline-offset-2">
                    Buchung &amp; Reisepakete
                  </Link>
                  ,{" "}
                  <Link to="/register" className="font-medium text-primary underline underline-offset-2">
                    Konto erstellen
                  </Link>{" "}
                  oder{" "}
                  <Link to="/impressum" className="font-medium text-primary underline underline-offset-2">
                    Impressum &amp; Kontakt
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>


      <Footer />
    </div>
  );
}

/* ── Stat pill for hero ── */
function StatPill({ icon: Icon, value, label }: { icon: typeof Globe; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 glass rounded-2xl px-4 py-3 sm:flex-row sm:gap-2.5 sm:px-5 sm:py-3">
      <Icon className="h-4 w-4 text-[#0d9e4f]" />
      <div className="text-center sm:text-left">
        <div className="text-sm font-bold text-white sm:text-base">{value}</div>
        <div className="text-[10px] text-white/60 sm:text-xs">{label}</div>
      </div>
    </div>
  );
}

/* ── Feature Chip: icons on mobile, glass cards on desktop ── */
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
  const scrollYRef = useRef(0);

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    scrollYRef.current = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.width = "100%";
    setOpen(true);
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    requestAnimationFrame(() => window.scrollTo(0, scrollYRef.current));
    setOpen(false);
  };

  return (
    <>
      {/* ── Mobile: compact icon circle ── */}
      <button
        onClick={handleOpen}
        className={`flex sm:hidden flex-col items-center gap-2 transition-all duration-300 ${open ? "scale-105" : ""}`}
      >
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full glass shadow-lg transition-all duration-300 ${
            open ? "ring-2 ring-[#0d9e4f]/60 scale-110 shadow-glow-green" : ""
          }`}
        >
          <Icon className={`h-7 w-7 ${iconColor?.split(" ")[0] || "text-white"}`} />
        </div>
        <span className="text-[11px] font-semibold text-white/90">{title}</span>
      </button>

      {/* ── Mobile: expanded detail modal ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md sm:hidden animate-in fade-in duration-200"
          onClick={handleClose}
        >
          <div
            className="mx-6 w-full max-w-xs rounded-3xl glass-card p-6 shadow-luxe animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className={`flex h-18 w-18 items-center justify-center rounded-full ${iconColor || "bg-primary/10 text-primary"}`}>
                <Icon className="h-9 w-9" />
              </div>
              <div className="text-lg font-bold text-foreground">{title}</div>
              <div className="text-sm text-muted-foreground leading-relaxed">{body}</div>
              <button
                onClick={handleClose}
                className="mt-2 rounded-full bg-[#0d9e4f]/10 px-5 py-2 text-xs font-semibold text-[#0d9e4f] transition hover:bg-[#0d9e4f]/20"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop: glass card with 3D tilt ── */}
      <div className="hidden sm:flex w-auto min-w-[200px] items-center gap-3 rounded-2xl glass px-5 py-4 card-3d shimmer">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconColor || "bg-white/10 text-white"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-left">
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="text-xs text-white/60">{body}</div>
        </div>
      </div>
    </>
  );
}

function SiteHeader() {
  const { user, signOut } = useAuth();
  const initial = (user?.user_metadata?.full_name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#1a2e4a]/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-6 sm:py-3">
        {/* Logo — bigger so it's clearly visible on dark navy */}
        <Link to="/" className="flex items-center shrink-0">
          <img src={logo} alt="Weltweiturlaub.de — Reiseplaner Deutschland" width={200} height={56} decoding="async" className="h-12 w-auto sm:h-14" />
        </Link>
        <div className="flex items-center gap-2">
          {/* Mobile: icon-only */}
          <Link
            to="/login"
            className="flex sm:hidden h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            title="Login"
          >
            <LogOut className="w-4 h-4 rotate-180" />
          </Link>
          <Link
            to="/register"
            className="flex sm:hidden h-9 w-9 items-center justify-center rounded-full bg-[#0d9e4f] text-white hover:bg-[#0bb858] transition shadow-sm"
            title="Register"
          >
            <UserIcon className="w-4 h-4" />
          </Link>
          {/* Desktop: full text */}
          <Link
            to="/login"
            className="hidden sm:flex text-sm font-semibold text-white/80 hover:text-white items-center gap-1.5 transition"
          >
            <LogOut className="w-4 h-4 rotate-180" /> Login
          </Link>
          <Link
            to="/register"
            className="hidden sm:flex text-sm font-semibold text-white bg-[#0d9e4f] hover:bg-[#0bb858] px-5 py-2.5 rounded-full items-center gap-1.5 transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <UserIcon className="w-4 h-4" /> Register
          </Link>
        </div>
      </div>
    </header>
  );
}

