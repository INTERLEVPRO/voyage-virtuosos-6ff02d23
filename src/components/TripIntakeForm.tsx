import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Calendar, Euro, Plane, Users, MapPin, Heart, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import type { TravelPackage } from "@/types/travel";
import { extractPackages } from "@/lib/extract-packages";

const AIRPORTS = [
  { code: "FRA", label: "Frankfurt (FRA)" },
  { code: "MUC", label: "München (MUC)" },
  { code: "BER", label: "Berlin (BER)" },
  { code: "HAM", label: "Hamburg (HAM)" },
  { code: "DUS", label: "Düsseldorf (DUS)" },
  { code: "VIE", label: "Wien (VIE)" },
  { code: "ZRH", label: "Zürich (ZRH)" },
  { code: "OTHER", label: "Anderer Flughafen" },
];

const TRAVELER_OPTIONS = [
  "1 Erwachsener",
  "2 Erwachsene",
  "2 Erwachsene + 1 Kind",
  "2 Erwachsene + 2 Kinder",
  "3 Erwachsene",
  "4 Erwachsene",
  "5 Erwachsene",
  "6 Erwachsene",
];

const VACATION_TYPES = [
  "Strand",
  "Entspannung",
  "Städtetrip",
  "Kultur",
  "Abenteuer",
  "Wellness",
  "Familie",
  "Honeymoon",
  "Kulinarik",
  "Natur",
];

const AGENT_STAGES = [
  "Concierge hört zu…",
  "Research-Agent sucht Flüge & Hotels…",
  "Budget-Agent erstellt 3 Pakete…",
  "Itinerary-Architekt plant deine Tage…",
  "Pakete werden zusammengestellt…",
];

function formatDateDe(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function nightsBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const diff = (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.round(diff));
}

export function TripIntakeForm({
  onPackagesReady,
}: {
  onPackagesReady?: (pkgs: TravelPackage[]) => void;
}) {
  const transport = new DefaultChatTransport({ api: "/api/chat" });
  const { messages, sendMessage, status, error } = useChat({ transport });

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [budget, setBudget] = useState("");
  const [airport, setAirport] = useState("FRA");
  const [travelers, setTravelers] = useState("2 Erwachsene");
  const [destination, setDestination] = useState("");
  const [vacationTypes, setVacationTypes] = useState<string[]>(["Strand", "Entspannung"]);
  const [submitted, setSubmitted] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const handedOffRef = useRef<Set<string>>(new Set());

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (status === "submitted") {
      setStageIdx(0);
      const id = setInterval(() => setStageIdx((i) => (i + 1) % AGENT_STAGES.length), 1800);
      return () => clearInterval(id);
    }
  }, [status]);

  useEffect(() => {
    if (status === "streaming" || status === "submitted") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (handedOffRef.current.has(last.id)) return;
    const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    const pkgs = extractPackages(text);
    if (pkgs && onPackagesReady) {
      handedOffRef.current.add(last.id);
      onPackagesReady(pkgs);
    }
  }, [messages, status, onPackagesReady]);

  const toggleType = (t: string) => {
    setVacationTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const nights = nightsBetween(dateFrom, dateTo);
  const valid =
    !!dateFrom &&
    !!dateTo &&
    nights > 0 &&
    !!budget &&
    Number(budget) > 0 &&
    !!airport &&
    !!travelers &&
    destination.trim().length >= 2 &&
    vacationTypes.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || isLoading) return;

    const airportLabel = AIRPORTS.find((a) => a.code === airport)?.label ?? airport;
    const prompt =
      `Reiseziel: ${destination.trim()}. ` +
      `Reisedaten: ${formatDateDe(dateFrom)}–${formatDateDt(dateTo)} (${nights} Nächte). ` +
      `Reisende: ${travelers}. ` +
      `Budget: ${Number(budget)}€ gesamt. ` +
      `Abflug: ${airportLabel}. ` +
      `Stil: ${vacationTypes.join(", ")}. ` +
      `Bitte erstelle 3 Pakete (Basic, Medium, Premium).`;

    setSubmitted(true);
    sendMessage({ text: prompt });
  };

  if (isLoading || submitted) {
    return (
      <div className="flex h-[640px] flex-col items-center justify-center gap-6 rounded-3xl border border-border bg-card p-10 shadow-card">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-8 w-8" />
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-foreground">Dein Reiseplan entsteht…</div>
          <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>{AGENT_STAGES[stageIdx]}</span>
          </div>
        </div>
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error.message}
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="ml-2 underline"
            >
              Erneut versuchen
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-card md:p-8"
    >
      <div>
        <h2 className="text-xl font-bold text-foreground">Lass uns starten – nur ein paar Details</h2>
        <p className="mt-1 text-sm text-muted-foreground">Ich finde 3 perfekte Pakete für dich.</p>
      </div>

      <FieldRow icon={Calendar} label="Reisedaten">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            required
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom || undefined}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            required
          />
        </div>
      </FieldRow>

      <FieldRow icon={Euro} label="Budget (gesamt)">
        <input
          type="number"
          inputMode="numeric"
          min={100}
          step={50}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="z. B. 2000"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          required
        />
      </FieldRow>

      <FieldRow icon={Plane} label="Abflughafen">
        <select
          value={airport}
          onChange={(e) => setAirport(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {AIRPORTS.map((a) => (
            <option key={a.code} value={a.code}>{a.label}</option>
          ))}
        </select>
      </FieldRow>

      <FieldRow icon={Users} label="Reisende">
        <select
          value={travelers}
          onChange={(e) => setTravelers(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {TRAVELER_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </FieldRow>

      <FieldRow icon={MapPin} label="Reiseziel / Region">
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="z. B. Portugal – Algarve, Mallorca, Bali"
          list="destination-suggestions"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          required
        />
        <datalist id="destination-suggestions">
          <option value="Portugal – Algarve" />
          <option value="Mallorca" />
          <option value="Bali" />
          <option value="Griechenland – Kreta" />
          <option value="Türkei – Antalya" />
          <option value="Lissabon" />
          <option value="Barcelona" />
          <option value="Thailand – Phuket" />
        </datalist>
      </FieldRow>

      <FieldRow icon={Heart} label="Welche Art Urlaub?">
        <div className="flex flex-wrap gap-2">
          {VACATION_TYPES.map((t) => {
            const active = vacationTypes.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => toggleType(t)}
                className={
                  active
                    ? "rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                    : "rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }
              >
                {t}
              </button>
            );
          })}
        </div>
      </FieldRow>

      <button
        type="submit"
        disabled={!valid}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Meinen perfekten Urlaub finden <Sparkles className="h-4 w-4" />
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Deine Daten sind sicher und werden nicht weitergegeben.
      </p>
    </form>
  );
}

function formatDateDt(iso: string): string {
  return formatDateDe(iso);
}

function FieldRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Calendar;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[28px_1fr] items-start gap-3">
      <div className="mt-2 flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
        {children}
      </div>
    </div>
  );
}
