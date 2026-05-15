import { useState } from "react";
import { ArrowLeft, Star, Sparkles, Plane, Hotel, MapPin, Compass, Utensils, Check, Pencil } from "lucide-react";
import type { TravelPackage } from "@/types/travel";
import { RefineComposer } from "./RefineComposer";
import { PriceConfirmation } from "./PriceConfirmation";

async function trackClick(packageId: string, provider: string, url: string) {
  try {
    await fetch("/api/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId, provider, url }),
    });
  } catch {
    // non-fatal
  }
}

function BookingButton({
  packageId,
  provider,
  url,
  label,
  Icon,
  primary,
}: {
  packageId: string;
  provider: string;
  url?: string;
  label: string;
  Icon: typeof Plane;
  primary?: boolean;
}) {
  if (!url) return null;
  return (
    <button
      onClick={() => {
        trackClick(packageId, provider, url);
        window.open(url, "_blank", "noopener,noreferrer");
      }}
      className={
        primary
          ? "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold px-5 py-3 text-sm font-medium text-primary shadow-soft transition-transform hover:scale-[1.02]"
          : "flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent hover:bg-secondary/40"
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

const QUICK_ACTIONS: { label: string; request: string }[] = [
  { label: "Anderes Hotel", request: "Bitte schlage ein anderes Hotel vor." },
  { label: "Günstiger machen", request: "Bitte mache das Paket günstiger." },
  { label: "Mehr Luxus", request: "Bitte mache das Paket luxuriöser." },
  { label: "Mehr Aktivitäten", request: "Bitte füge mehr Aktivitäten hinzu." },
];

type RefineResponse =
  | {
      status: "needs_confirmation";
      message: string;
      proposedPackage: TravelPackage;
      oldPrice: number;
      newPrice: number;
      priceDifference: number;
      changeSummary: string;
    }
  | { status: "updated"; updatedPackage: TravelPackage; changeSummary: string }
  | { status: "rejected"; message: string }
  | { status: "error"; message: string };

type Mode =
  | { kind: "idle" }
  | { kind: "planOk" }
  | { kind: "composing" }
  | {
      kind: "confirming";
      proposal: TravelPackage;
      oldPrice: number;
      newPrice: number;
      priceDifference: number;
      changeSummary: string;
      lastChangeRequest: string;
    };

export function PackageDetail({
  pkg,
  onBack,
}: {
  pkg: TravelPackage;
  onBack: () => void;
}) {
  const [currentPkg, setCurrentPkg] = useState<TravelPackage>(pkg);
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function callRefine(changeRequest: string, userConfirmedBudget: boolean) {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/refine-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedPackage: currentPkg,
          changeRequest,
          userConfirmedBudget,
        }),
      });
      const data = (await res.json()) as RefineResponse;
      if (data.status === "needs_confirmation") {
        setMode({
          kind: "confirming",
          proposal: data.proposedPackage,
          oldPrice: data.oldPrice,
          newPrice: data.newPrice,
          priceDifference: data.priceDifference,
          changeSummary: data.changeSummary,
          lastChangeRequest: changeRequest,
        });
      } else if (data.status === "updated") {
        setCurrentPkg(data.updatedPackage);
        setMode({ kind: "idle" });
        setNotice(`Alles klar, ich habe dein Paket angepasst. ${data.changeSummary}`);
      } else if (data.status === "rejected") {
        setMode({ kind: "idle" });
        setNotice(data.message);
      } else {
        setNotice(data.message ?? "Etwas ist schiefgegangen.");
      }
    } catch {
      setNotice("Verbindung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }

  function handleQuickAction(req: string) {
    setMode({ kind: "composing" });
    callRefine(req, false);
  }

  function handleAcceptPrice() {
    if (mode.kind !== "confirming") return;
    callRefine(mode.lastChangeRequest, true);
  }

  function handleCancelPrice() {
    setMode({ kind: "idle" });
    setNotice("Kein Problem, ich lasse den ursprünglichen Plan unverändert.");
  }

  const showPlanCheck = mode.kind !== "planOk";

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück zu den Vorschlägen
      </button>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-8 lg:col-span-2">
          {/* Hero */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
            <span className="rounded-full bg-gradient-gold px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
              {currentPkg.type}
            </span>
            <h1 className="mt-4 font-display text-4xl text-primary md:text-5xl">{currentPkg.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {currentPkg.destination}</span>
              <span>· {currentPkg.duration}</span>
              <span className="inline-flex items-center gap-1 text-accent">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-medium text-foreground">{currentPkg.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({currentPkg.reviews.toLocaleString("de-DE")})</span>
              </span>
              <span className="inline-flex items-center gap-1 text-accent">
                <Sparkles className="h-4 w-4" />
                <span className="font-medium text-foreground">{currentPkg.matchScore}% Match</span>
              </span>
            </div>
            <p className="mt-5 text-base leading-relaxed text-foreground/80">{currentPkg.summary}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {currentPkg.badges.map((b) => (
                <span key={b} className="rounded-full border border-border bg-secondary/40 px-2.5 py-0.5 text-xs text-secondary-foreground">
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Plan-Check */}
          {showPlanCheck && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
              <h2 className="font-display text-xl text-primary">
                Ist dieser Reiseplan für dich in Ordnung, oder möchtest du etwas ändern?
              </h2>

              {notice && (
                <p className="mt-3 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground/80">
                  {notice}
                </p>
              )}

              {mode.kind !== "confirming" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setMode({ kind: "planOk" });
                      setNotice(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-4 py-2 text-sm font-medium text-primary shadow-soft disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Plan OK
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setMode({ kind: "composing" })}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-accent hover:bg-secondary/40 disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4" /> Plan ändern
                  </button>
                  {QUICK_ACTIONS.map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickAction(a.request)}
                      className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-accent hover:bg-secondary/40 disabled:opacity-50"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}

              {mode.kind === "composing" && (
                <RefineComposer
                  loading={loading}
                  onSubmit={(text) => callRefine(text, false)}
                />
              )}

              {mode.kind === "confirming" && (
                <PriceConfirmation
                  oldPrice={mode.oldPrice}
                  newPrice={mode.newPrice}
                  priceDifference={mode.priceDifference}
                  changeSummary={mode.changeSummary}
                  loading={loading}
                  onAccept={handleAcceptPrice}
                  onCancel={handleCancelPrice}
                />
              )}
            </div>
          )}

          {/* Flight & Hotel */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Plane className="h-4 w-4" /> Flug
              </div>
              <p className="mt-3 text-sm text-foreground/80">{currentPkg.flight}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Hotel className="h-4 w-4" /> Hotel
              </div>
              <p className="mt-3 text-sm text-foreground/80">{currentPkg.hotel}</p>
              {currentPkg.mealPlan && (
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Utensils className="h-3.5 w-3.5" /> {currentPkg.mealPlan}
                </p>
              )}
            </div>
          </div>

          {/* Activities */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Compass className="h-4 w-4" /> Aktivitäten
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {currentPkg.activities.map((a) => (
                <li key={a} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
                  {a}
                </li>
              ))}
            </ul>
          </div>

          {/* Itinerary */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
            <h2 className="font-display text-2xl text-primary">Tag für Tag</h2>
            <ol className="mt-5 space-y-5">
              {currentPkg.itinerary.map((d) => (
                <li key={d.day} className="border-l-2 border-accent/40 pl-4">
                  <div className="font-display text-lg text-primary">
                    Tag {d.day} — {d.title}
                  </div>
                  <p className="mt-1 text-sm text-foreground/80">{d.description}</p>
                </li>
              ))}
            </ol>
          </div>

          {currentPkg.whyItFits && (
            <div className="rounded-2xl border border-accent/40 bg-accent/5 p-6 shadow-soft md:p-8">
              <h2 className="font-display text-xl text-primary">Warum dieses Paket zu dir passt</h2>
              <p className="mt-2 text-sm text-foreground/80">{currentPkg.whyItFits}</p>
            </div>
          )}
        </div>

        {/* Sticky booking box */}
        <aside className="lg:col-span-1">
          <div className="sticky top-6 rounded-2xl border border-border bg-card p-6 shadow-luxe">
            <div className="font-display text-3xl text-primary">
              {currentPkg.price.toLocaleString("de-DE")} {currentPkg.currency === "EUR" ? "€" : currentPkg.currency}
            </div>
            <div className="text-xs text-muted-foreground">pro Person · ca.</div>

            <div className="mt-5 space-y-2.5">
              <BookingButton
                packageId={currentPkg.id}
                provider="hotel"
                url={currentPkg.bookingLinks?.hotel}
                label="Hotel ansehen"
                Icon={Hotel}
                primary
              />
              <BookingButton
                packageId={currentPkg.id}
                provider="flight"
                url={currentPkg.bookingLinks?.flight}
                label="Flugangebote prüfen"
                Icon={Plane}
              />
              <BookingButton
                packageId={currentPkg.id}
                provider="activities"
                url={currentPkg.bookingLinks?.activities}
                label="Aktivitäten entdecken"
                Icon={Compass}
              />
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Buchung erfolgt über unsere Partner. Preise sind Richtwerte und können je nach Verfügbarkeit variieren.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
