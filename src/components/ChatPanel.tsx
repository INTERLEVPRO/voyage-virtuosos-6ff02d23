import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { DateRange } from "react-day-picker";
import {
  Send,
  Loader2,
  Sparkles,
  ShieldCheck,
  MessagesSquare,
  Search,
  Wallet,
  Map as MapIcon,
  Wand2,
  CalendarDays,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import assistantImg from "@/assets/assistant.png";
import type { TravelPackage, PackagesPayload } from "@/types/travel";


const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function formatGermanDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d}. ${MONTHS_DE[m - 1]} ${y}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STARTER_PROMPTS: { emoji: string; title: string; subtitle: string; prompt: string }[] = [
  {
    emoji: "🏖️",
    title: "Mallorca",
    subtitle: "7 Tage · 2 Personen · 1.500 €",
    prompt: "Mallorca, 7 Tage, 2 Personen, Budget 1500€, Strand & Entspannung, Abflug Frankfurt, Juni",
  },
  {
    emoji: "🏙️",
    title: "Lissabon",
    subtitle: "4 Tage · 1 Person · 1.200 €",
    prompt: "Städtetrip Lissabon, 4 Tage, 1 Person, Budget 1200€, Kunst & gutes Essen, Abflug München, September",
  },
  {
    emoji: "🌴",
    title: "Bali",
    subtitle: "10 Tage · 2 Personen · 5.000 €",
    prompt: "Bali Honeymoon, 10 Tage, 2 Personen, Budget 5000€, Wellness & Strand, Abflug Berlin, Juni",
  },
];

const AGENT_STAGES = [
  { icon: MessagesSquare, label: "Concierge hört zu", sub: "Wir verstehen deinen Reisewunsch" },
  { icon: Search, label: "Research-Agent sucht", sub: "Flüge & Hotels werden geprüft" },
  { icon: Wallet, label: "Budget-Agent rechnet", sub: "3 Pakete in deinem Budget" },
  { icon: MapIcon, label: "Itinerary-Architekt plant", sub: "Tag für Tag wird gebaut" },
  { icon: Wand2, label: "Letzter Schliff", sub: "Pakete werden zusammengestellt" },
];

const JSON_BLOCK_RE = /```json\s*([\s\S]*?)```/i;

function extractPackages(text: string): TravelPackage[] | null {
  const m = text.match(JSON_BLOCK_RE);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1]) as PackagesPayload;
    if (parsed?.status === "packages_ready" && Array.isArray(parsed.packages)) {
      return parsed.packages;
    }
  } catch {
    return null;
  }
  return null;
}

function stripJsonBlock(text: string): string {
  return text.replace(JSON_BLOCK_RE, "").trim();
}

/* ── Schnellstart: icon circles on mobile, full cards on desktop ── */
function StarterPrompts({ submit }: { submit: (text: string) => void }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Schnellstart
      </div>

      {/* ── Mobile: compact icon row ── */}
      <div className="flex justify-center gap-5 sm:hidden">
        {STARTER_PROMPTS.map((p, i) => (
          <button
            key={p.title}
            onClick={() => setOpenIdx(i)}
            className="flex flex-col items-center gap-1.5 transition-all duration-300"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card border border-border shadow-soft transition-all duration-300 hover:scale-110 text-2xl">
              {p.emoji}
            </div>
            <span className="text-[11px] font-semibold text-foreground">{p.title}</span>
          </button>
        ))}
      </div>

      {/* ── Mobile: detail modal ── */}
      {openIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm sm:hidden animate-in fade-in duration-200"
          onClick={() => setOpenIdx(null)}
        >
          <div
            className="mx-6 w-full max-w-xs rounded-3xl border border-border bg-card p-6 shadow-luxe animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="text-5xl">{STARTER_PROMPTS[openIdx].emoji}</span>
              <div className="text-lg font-bold text-foreground">{STARTER_PROMPTS[openIdx].title}</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                {STARTER_PROMPTS[openIdx].subtitle}
              </div>
              <button
                onClick={() => {
                  submit(STARTER_PROMPTS[openIdx].prompt);
                  setOpenIdx(null);
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-primary/90"
              >
                <Sparkles className="h-4 w-4" /> Paket erstellen
              </button>
              <button
                onClick={() => setOpenIdx(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop: original cards ── */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-2.5">
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p.title}
            onClick={() => submit(p.prompt)}
            className="group relative flex w-full flex-col items-start gap-1.5 overflow-hidden rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-card"
          >
            <div className="absolute right-0 top-0 h-16 w-16 -translate-y-6 translate-x-6 rounded-full bg-primary/5 transition-transform group-hover:translate-x-4 group-hover:-translate-y-4" />
            <span className="text-3xl leading-none" aria-hidden>
              {p.emoji}
            </span>
            <span className="text-sm font-semibold text-foreground">{p.title}</span>
            <span className="text-xs leading-tight text-muted-foreground">
              {p.subtitle}
            </span>
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Paket erstellen
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatPanel({ onPackagesReady }: { onPackagesReady?: (pkgs: TravelPackage[]) => void }) {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const [stageIdx, setStageIdx] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [dateOpen, setDateOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const handedOffRef = useRef<Set<string>>(new Set());

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (isLoading) {
      setStageIdx(0);
      const id = setInterval(() => {
        setStageIdx((i) => Math.min(i + 1, AGENT_STAGES.length - 1));
      }, 2200);
      return () => clearInterval(id);
    }
  }, [isLoading]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status, stageIdx]);

  useEffect(() => {
    inputRef.current?.focus();
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

  const submit = (text: string) => {
    if (!text.trim() || isLoading) return;
    sendMessage({ text: text.trim() });
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "48px";
    }
  };

  const StageIcon = AGENT_STAGES[stageIdx].icon;
  const progress = ((stageIdx + 1) / AGENT_STAGES.length) * 100;

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[560px] flex-col overflow-hidden rounded-3xl border border-[#1a2e4a]/10 glass-card shadow-luxe sm:h-[660px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#1a2e4a] via-[#243b5c] to-[#1a2e4a] text-white px-4 py-3 sm:px-5 sm:py-4 shimmer">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0">
            <div className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-[#0d9e4f]/40" />
            <img
              src={assistantImg}
              alt=""
              aria-hidden
              className="absolute inset-0 m-auto h-8 w-8 object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              Reise-Assistent
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/70 sm:text-xs">
              <span>Erzähl mir von deinem Traumurlaub</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/90">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Online
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-[#e3f0ff]/50 via-[#f0f6fc] to-[#f0f6fc] px-3 py-5 sm:px-5 sm:py-6"
      >
        {messages.length === 0 && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft sm:p-5">
              <p className="text-sm font-semibold text-foreground sm:text-base">
                Wohin soll deine Reise gehen? 🌍
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Reiseziel, Budget, Dauer und dein Stil — je mehr du erzählst, desto besser passen deine 3 Pakete.
              </p>
            </div>

            <StarterPrompts submit={submit} />
          </div>
        )}

        {messages.map((m) => {
          const raw = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          const display = m.role === "assistant" ? stripJsonBlock(raw) : raw;
          const isUser = m.role === "user";
          if (!display && isUser) return null;
          return (
            <div
              key={m.id}
              className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/15">
                  <img src={assistantImg} alt="" aria-hidden className="h-5 w-5 object-contain" />
                </div>
              )}
              <div
                className={
                  isUser
                    ? "max-w-[82%] rounded-2xl rounded-br-md bg-gradient-to-br from-[#1a2e4a] to-[#243b5c] px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-soft sm:max-w-[75%] sm:px-4 sm:py-3"
                    : "max-w-[88%] rounded-2xl rounded-bl-md border border-[#1a2e4a]/8 glass-card px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-soft sm:max-w-[80%] sm:px-4 sm:py-3"
                }
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap break-words">{display}</p>
                ) : (
                  <div className="prose-luxe break-words">
                    <ReactMarkdown>{display || "…"}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-end gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/15">
              <img src={assistantImg} alt="" aria-hidden className="h-5 w-5 object-contain" />
            </div>
            <div className="w-full max-w-[88%] overflow-hidden rounded-2xl rounded-bl-md border border-border bg-card shadow-soft sm:max-w-[80%]">
              <div className="flex items-center gap-3 px-3.5 py-3 sm:px-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0d9e4f]/10 text-[#0d9e4f]">
                  <StageIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {AGENT_STAGES[stageIdx].label}
                    </span>
                    <span className="flex gap-0.5">
                      <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-primary" />
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                    {AGENT_STAGES[stageIdx].sub}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {stageIdx + 1}/{AGENT_STAGES.length}
                </span>
              </div>
              <div className="h-1 w-full bg-secondary/60">
                <div
                  className="h-full bg-gradient-to-r from-[#0d9e4f] to-[#2196f3] transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error.message}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="w-full border-t border-border bg-card px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pt-4"
      >
        <div className="relative mx-auto flex w-full max-w-3xl items-end gap-2 rounded-3xl border border-[#1a2e4a]/12 bg-white/80 px-2.5 py-1.5 transition-all focus-within:border-[#0d9e4f]/50 focus-within:shadow-glow-green sm:px-3 sm:py-2">
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Reisezeitraum wählen (Start- und Enddatum)"
                aria-label="Reisezeitraum wählen"
                disabled={isLoading}
                className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-primary disabled:opacity-50"
              >
                <CalendarDays className="h-6 w-6 sm:h-5 sm:w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="top"
              sideOffset={8}
              className="w-[min(92vw,360px)] max-w-[92vw] p-0 overflow-hidden"
            >
              <div className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">
                {dateRange?.from
                  ? dateRange.to
                    ? `${formatGermanDate(toISO(dateRange.from))} – ${formatGermanDate(toISO(dateRange.to))}`
                    : `Start: ${formatGermanDate(toISO(dateRange.from))} · Enddatum wählen`
                  : "Startdatum wählen"}
              </div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
                disabled={{ before: new Date() }}
                className="w-full [--cell-size:2.25rem]"
              />
              <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
                <button
                  type="button"
                  onClick={() => setDateRange(undefined)}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Zurücksetzen
                </button>
                <button
                  type="button"
                  disabled={!dateRange?.from}
                  onClick={() => {
                    if (!dateRange?.from) return;
                    const from = formatGermanDate(toISO(dateRange.from));
                    const to = dateRange.to ? formatGermanDate(toISO(dateRange.to)) : "";
                    const snippet = to ? `${from} bis ${to}` : from;
                    setInput((prev) => {
                      const sep = prev && !prev.endsWith(" ") ? " " : "";
                      return `${prev}${sep}${snippet}`;
                    });
                    setDateOpen(false);
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                  className="rounded-full bg-[#0d9e4f] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0bb858] disabled:opacity-40"
                >
                  Übernehmen
                </button>
              </div>
            </PopoverContent>
          </Popover>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const el = e.currentTarget;
              el.style.height = "auto";
              const next = Math.min(el.scrollHeight, 160);
              el.style.height = next + "px";
              el.style.overflowY = el.scrollHeight > 160 ? "auto" : "hidden";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={1}
            placeholder="z.B. Mallorca, 7 Tage, 2 Personen, Budget 1.500€..."
            className="composer-textarea min-h-[44px] max-h-[160px] flex-1 resize-none border-0 bg-transparent italic px-2 py-2.5 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-0"
            style={{ height: 44 }}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            aria-label="Senden"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d9e4f] text-white transition-all hover:bg-[#0bb858] hover:shadow-glow-green hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:bg-gray-200 disabled:hover:shadow-none disabled:hover:translate-y-0 disabled:bg-gray-200 disabled:text-gray-400 sm:h-10 sm:w-10"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground sm:text-[11px]">
          <ShieldCheck className="h-3 w-3 text-[#0d9e4f]" />
          Deine Daten sind sicher und werden nicht weitergegeben.
        </p>
      </form>
    </div>
  );
}
