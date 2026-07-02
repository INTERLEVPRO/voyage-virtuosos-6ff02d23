import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { DateRange } from "react-day-picker";
import {
  Send,
  Loader2,
  Sparkles,
  ShieldCheck,
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

function toISO(d: Date): string {
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

type ChatPart = { type: "text"; text: string };
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  parts: ChatPart[];
};
type ChatStatus = "ready" | "submitted" | "streaming";

function makeMessage(role: ChatMessage["role"], text: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    parts: [{ type: "text", text }],
  };
}

function appendAssistantDelta(
  messages: ChatMessage[],
  assistantId: string,
  delta: string,
) {
  const existing = messages.find((m) => m.id === assistantId);
  if (!existing) {
    return [...messages, { id: assistantId, role: "assistant" as const, parts: [{ type: "text" as const, text: delta }] }];
  }

  return messages.map((m) => {
    if (m.id !== assistantId) return m;
    const current = m.parts[0]?.text ?? "";
    return { ...m, parts: [{ type: "text" as const, text: current + delta }] };
  });
}

/* ── Schnellstart: horizontal scroll on mobile, full cards on desktop ── */
function StarterPrompts({ submit }: { submit: (text: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Schnellstart
      </div>

      {/* ── Mobile: horizontally scrollable cards ── */}
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 sm:hidden hide-scrollbar snap-x snap-mandatory [overscroll-behavior-x:contain] [touch-action:pan-x]">
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p.title}
            onClick={() => submit(p.prompt)}
            className="snap-start shrink-0 w-[240px] flex flex-col items-start gap-1.5 rounded-2xl border border-border bg-card p-3 text-left shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2 w-full">
              <span className="text-2xl leading-none" aria-hidden>
                {p.emoji}
              </span>
              <span className="text-sm font-semibold text-foreground truncate">{p.title}</span>
            </div>
            <span className="text-xs leading-tight text-muted-foreground line-clamp-2">
              {p.subtitle}
            </span>
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/5 px-2 py-1 rounded-md">
              <Sparkles className="h-3 w-3" /> Paket erstellen
            </span>
          </button>
        ))}
      </div>

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<Error | null>(null);
  const [input, setInput] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [showGeneratingLoader, setShowGeneratingLoader] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [dateOpen, setDateOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const handedOffRef = useRef<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const isLoading = status === "submitted" || status === "streaming";

  // Full-screen narrative loader only when package generation is actually
  // running (slow request) — NOT for short Q&A turns.
  useEffect(() => {
    if (!isLoading) {
      setShowGeneratingLoader(false);
      return;
    }
    const t = setTimeout(() => setShowGeneratingLoader(true), 2500);
    return () => clearTimeout(t);
  }, [isLoading]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [status]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (status === "streaming" || status === "submitted") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (handedOffRef.current.has(last.id)) return;
    const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    const pkgs = extractPackages(text);
    if (pkgs && onPackagesReady) {
      handedOffRef.current.add(last.id);
      setIsSuccess(true);
      onPackagesReady(pkgs);
    }
  }, [messages, status, onPackagesReady]);

  const lastUserMessage = useMemo(() => {
    const m = [...messages].reverse().find(m => m.role === "user");
    if (!m) return input;
    return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  }, [messages, input]);

  const submit = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMessage = makeMessage("user", text.trim());
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setError(null);
    setStatus("submitted");
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "48px";
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(body || `Chat request failed (${response.status})`);
      }

      if (!response.body) throw new Error("Keine Antwort vom Chat-Server erhalten.");

      setStatus("streaming");
      const assistantId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleFrame = (frame: string) => {
        const dataLines = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart());
        if (dataLines.length === 0) return;
        const payload = dataLines.join("\n").trim();
        if (!payload || payload === "[DONE]") return;

        try {
          const event = JSON.parse(payload) as { type?: string; delta?: string; errorText?: string; message?: string };
          if (event.type === "text-delta" && event.delta) {
            setMessages((current) => appendAssistantDelta(current, assistantId, event.delta!));
          }
          if (event.type === "error") {
            throw new Error(event.errorText || event.message || "Chat stream error");
          }
        } catch (err) {
          if (err instanceof SyntaxError) return;
          throw err;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? "";
        frames.forEach(handleFrame);
      }
      buffer += decoder.decode();
      if (buffer.trim()) handleFrame(buffer);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setStatus("ready");
    }
  };



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
              align="center"
              side="top"
              sideOffset={12}
              collisionPadding={12}
              className="w-[calc(100vw-1rem)] max-w-[26rem] sm:w-auto sm:min-w-[340px] p-0 overflow-hidden shadow-luxe rounded-3xl sm:rounded-2xl border-white/20 bg-white/95 backdrop-blur-md pointer-events-auto flex flex-col max-h-[min(80vh,38rem)]"
              avoidCollisions={true}
            >
              <div className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground shrink-0">
                {dateRange?.from
                  ? dateRange.to
                    ? `${formatGermanDate(toISO(dateRange.from))} – ${formatGermanDate(toISO(dateRange.to))}`
                    : `Start: ${formatGermanDate(toISO(dateRange.from))} · Enddatum wählen`
                  : "Startdatum wählen"}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                  min={1}
                  disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                  defaultMonth={dateRange?.from ?? new Date()}
                  className="pointer-events-auto w-full [--cell-size:2.5rem] sm:[--cell-size:2.25rem] [touch-action:manipulation] [&_button]:[touch-action:manipulation] [&_button]:pointer-events-auto"
                />
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border bg-white px-3 py-2.5 shrink-0">
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
                  className="rounded-full bg-[#0d9e4f] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0bb858] disabled:opacity-40"
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

      {(showGeneratingLoader || isSuccess) && <FullScreenTypingLoader userQuery={lastUserMessage} />}
    </div>
  );
}

/* ── Destination travel guide database ── */
const DESTINATION_GUIDES: Record<string, { emoji: string; title: string; sections: string[] }> = {
  mallorca: {
    emoji: "🏖️",
    title: "Mallorca",
    sections: [
      "✨ Willkommen auf Mallorca — der Perle des Mittelmeers!\n\nStell dir vor: Du landest auf der Insel und sofort umfängt dich warme Meeresluft. Die Serra de Tramuntana erhebt sich majestätisch im Nordwesten, während türkisblaues Wasser an goldene Sandstrände plätschert.",
      "\n\n🏛️ Was dich erwartet:\nDie Altstadt von Palma verzaubert mit der imposanten Kathedrale La Seu, deren gotische Architektur im Sonnenlicht golden leuchtet. Schlendere durch enge Gassen mit Boutiquen, Tapas-Bars und versteckten Innenhöfen voller Orangenbäume.",
      "\n\n🌊 Deine schönsten Erlebnisse:\nEntdecke die geheime Bucht Caló des Moro mit kristallklarem Wasser. Wandere durch die Schlucht Torrent de Pareis. Besuche das charmante Bergdorf Valldemossa, wo einst Chopin komponierte. Genieße frischen Fisch in einem Restaurant direkt am Hafen von Port de Sóller.",
      "\n\n🍷 Kulinarische Highlights:\nProbiere Ensaimada, das buttrige Hefegebäck. Genieße Pa amb oli mit Olivenöl und Tomaten. Trinke einen Hierbas-Likör bei Sonnenuntergang an der Westküste.",
      "\n\n🌅 Warum Mallorca perfekt für dich ist:\nDie Mischung aus Kultur, Natur und Strandleben macht Mallorca einzigartig. Von lebhaften Märkten bis zu einsamen Buchten — hier findet jeder sein Paradies.\n\nIch stelle jetzt dein perfektes Mallorca-Paket zusammen...",
    ],
  },
  lissabon: {
    emoji: "🏙️",
    title: "Lissabon",
    sections: [
      "✨ Willkommen in Lissabon — der Stadt des Lichts!\n\nDie portugiesische Hauptstadt erwartet dich mit sieben Hügeln voller farbenfroher Azulejo-Fassaden, dem Duft von frisch gebackenen Pastéis de Nata und dem melancholischen Klang des Fado, der durch die engen Gassen der Alfama hallt.",
      "\n\n🏛️ Was dich erwartet:\nDer majestätische Torre de Belém wacht am Ufer des Tejo über die Stadt. Die gelbe Tram 28 rattert durch steile Straßen vorbei an der Sé Kathedrale. Im Stadtteil Chiado treffen historische Cafés auf moderne Kunstgalerien.",
      "\n\n🌊 Deine schönsten Erlebnisse:\nFahre mit der historischen Tram 28 durch die Altstadt. Bestaune die Aussicht vom Miradouro da Graça bei Sonnenuntergang. Entdecke das Ozeanarium — eines der größten Europas. Schlendere über den Time Out Market und probiere die besten Gerichte der Stadt.",
      "\n\n🍷 Kulinarische Highlights:\nKoste Pastéis de Nata in der legendären Pastéis de Belém. Genieße frischen Bacalhau in einem traditionellen Tascas. Trinke Ginjinha, den süßen Kirschlikör, an der berühmten Bar A Ginjinha.",
      "\n\n🌅 Warum Lissabon perfekt für dich ist:\nLissabon verbindet Altes mit Neuem wie kaum eine andere Stadt. Die Wärme der Menschen, die atemberaubende Architektur und das pulsierende Nachtleben machen jeden Besuch unvergesslich.\n\nIch stelle jetzt dein perfektes Lissabon-Paket zusammen...",
    ],
  },
  bali: {
    emoji: "🌴",
    title: "Bali",
    sections: [
      "✨ Willkommen auf Bali — der Insel der Götter!\n\nSchließe die Augen und stell dir vor: Smaragdgrüne Reisterrassen erstrecken sich über sanfte Hügel, Räucherstäbchen duften vor kunstvoll geschnitzten Tempeln, und das warme Wasser des Indischen Ozeans umspült schwarze Vulkanstrände.",
      "\n\n🏛️ Was dich erwartet:\nDer heilige Tempel Tanah Lot thront auf einem Felsen im Meer — bei Sonnenuntergang ein magischer Anblick. In Ubud erwarten dich der berühmte Affenwald, traditionelle Tanzdarbietungen und Kunsthandwerk-Ateliers inmitten tropischer Natur.",
      "\n\n🌊 Deine schönsten Erlebnisse:\nSurfe die perfekten Wellen von Uluwatu. Schwimme unter einem Wasserfall im Dschungel von Munduk. Entdecke das versunkene Schiffswrack USS Liberty beim Schnorcheln in Tulamben. Erlebe eine balinesische Spa-Behandlung mit Blütenblättern und ätherischen Ölen.",
      "\n\n🍜 Kulinarische Highlights:\nProbiere Babi Guling, das berühmte Spanferkel Balis. Genieße Nasi Goreng bei Sonnenaufgang auf einer Reisterrasse. Trinke frisch gepressten Kokosnusswasser direkt aus der Schale an einem Strandwarung.",
      "\n\n🌅 Warum Bali perfekt für dich ist:\nBali ist mehr als nur ein Reiseziel — es ist eine Seelenerfahrung. Die spirituelle Atmosphäre, die herzliche Gastfreundschaft und die atemberaubende Natur machen jeden Moment unvergesslich.\n\nIch stelle jetzt dein perfektes Bali-Paket zusammen...",
    ],
  },
  "sri lanka": {
    emoji: "🐘",
    title: "Sri Lanka",
    sections: [
      "✨ Willkommen in Sri Lanka — der Perle des Indischen Ozeans!\n\nStell dir vor: Du fährst mit dem legendären Zug durch das Hochland, vorbei an endlosen Teeplantagen, die sich wie ein grüner Teppich über die Berge legen. Nebelschwaden ziehen durch die Täler, während Elefantenherden gemächlich durch den Dschungel wandern.",
      "\n\n🏛️ Was dich erwartet:\nDie uralte Felsenfestung Sigiriya ragt 200 Meter in den Himmel — oben erwartet dich ein 360°-Panorama über den endlosen Dschungel. In Kandy bewacht der heilige Zahntempel eine Reliquie Buddhas. Die kolonialen Gassen von Galle Fort erzählen Geschichten aus Jahrhunderten.",
      "\n\n🌊 Deine schönsten Erlebnisse:\nBeobachte Blauwale vor der Küste von Mirissa — die größten Tiere der Erde! Wandere zum World's End in den Horton Plains, wo die Klippe 880 Meter senkrecht abfällt. Besuche eine Teefabrik in Ella und koste frisch gepflückten Ceylon-Tee. Fahre mit dem berühmten blauen Zug über die Nine Arches Bridge.",
      "\n\n🍛 Kulinarische Highlights:\nProbiere ein authentisches Rice & Curry mit über 10 verschiedenen Beilagen. Genieße Hoppers — knusprige Reismehlpfannkuchen — zum Frühstück. Koste Kottu Roti, das auf einer heißen Platte zerhackt wird — das Geräusch ist legendär! Trinke frischen King Coconut am Strand von Tangalle.",
      "\n\n🌅 Warum Sri Lanka perfekt für dich ist:\nKein anderes Land bietet auf so kleinem Raum so viel Vielfalt: Traumstrände, uralte Tempel, Teeplantagen im Nebel, wilde Elefanten und eine der freundlichsten Kulturen der Welt. Sri Lanka ist das Abenteuer deines Lebens.\n\nIch stelle jetzt dein perfektes Sri Lanka-Paket zusammen...",
    ],
  },
  thailand: {
    emoji: "🙏",
    title: "Thailand",
    sections: [
      "✨ Willkommen in Thailand — dem Land des Lächelns!\n\nStell dir vor: Goldene Tempelspitzen glitzern im Morgenlicht von Bangkok, türkisblaues Wasser umspült dramatische Kalksteinfelsen in der Andamanensee, und der Duft von Pad Thai und Tom Yum zieht durch belebte Nachtmärkte.",
      "\n\n🏛️ Was dich erwartet:\nDer Große Palast in Bangkok ist ein Meisterwerk aus Gold und Mosaiken. Der Wat Pho beherbergt einen 46 Meter langen liegenden Buddha. In Chiang Mai erwarten dich über 300 Tempel, ein Nachtbasar voller Kunsthandwerk und Kochkurse in tropischen Gärten.",
      "\n\n🌊 Deine schönsten Erlebnisse:\nKayake durch die smaragdgrünen Lagunen von Phang Nga Bay. Schnorchle mit bunten Fischen bei den Similan-Inseln. Besuche ein ethisches Elefantenschutzgebiet in Chiang Mai. Lerne Thai-Boxen oder Thai-Massage in authentischen Schulen.",
      "\n\n🍜 Kulinarische Highlights:\nProbiere Pad Thai direkt vom Straßenstand in Bangkok. Genieße ein Khao Soi — cremiges Curry-Nudelsuppe — in Chiang Mai. Trinke frischen Mango Sticky Rice als Dessert. Entdecke die Aromen auf einem schwimmenden Markt in Damnoen Saduak.",
      "\n\n🌅 Warum Thailand perfekt für dich ist:\nThailand vereint tropische Traumstrände mit reicher Kultur, abenteuerliche Natur mit pulsierendem Stadtleben — und das alles zu einem fantastischen Preis-Leistungs-Verhältnis.\n\nIch stelle jetzt dein perfektes Thailand-Paket zusammen...",
    ],
  },
  italien: {
    emoji: "🇮🇹",
    title: "Italien",
    sections: [
      "✨ Willkommen in Italien — wo La Dolce Vita zu Hause ist!\n\nStell dir vor: Du sitzt auf einer sonnengewärmten Piazza, nippst an einem Espresso, während die Glocken einer Renaissance-Kirche läuten. Der Duft von frisch gebackener Pizza weht aus einer kleinen Trattoria, und in der Ferne leuchtet das Mittelmeer.",
      "\n\n🏛️ Was dich erwartet:\nDas Kolosseum in Rom erzählt von Gladiatorenkämpfen. Die Kanäle von Venedig spiegeln prächtige Paläste wider. In Florenz hängt Michelangelos David und Botticellis Venus. Die Amalfiküste bietet atemberaubende Klippen mit bunten Dörfern.",
      "\n\n🌊 Deine schönsten Erlebnisse:\nWandere durch die Weinberge der Toskana bei goldenem Abendlicht. Fahre mit einer Gondel durch Venedigs stille Kanäle. Wirf eine Münze in den Trevi-Brunnen. Besuche die bunten Fischerdörfer der Cinque Terre, verbunden durch Küstenwanderwege über dem Meer.",
      "\n\n🍝 Kulinarische Highlights:\nGenieße echte Neapolitanische Pizza aus dem Holzofen. Probiere frische Pasta Cacio e Pepe in einer römischen Trattoria. Schlürfe Chianti in einem toskanischen Weingut. Koste Gelato in dutzenden Geschmacksrichtungen — Pistazie aus Bronte ist legendär!",
      "\n\n🌅 Warum Italien perfekt für dich ist:\nItalien ist ein Fest für alle Sinne — Kunst, Geschichte, Natur und die beste Küche der Welt, vereint mit der unnachahmlichen italienischen Lebensfreude.\n\nIch stelle jetzt dein perfektes Italien-Paket zusammen...",
    ],
  },
  griechenland: {
    emoji: "🇬🇷",
    title: "Griechenland",
    sections: [
      "✨ Willkommen in Griechenland — der Wiege der Zivilisation!\n\nStell dir vor: Weiß getünchte Häuser mit blauen Kuppeln stehen vor dem tiefblauen Ägäischen Meer. Antike Ruinen erzählen Geschichten von Göttern und Helden. Der Duft von Oregano und gegrilltem Souvlaki liegt in der warmen Abendluft.",
      "\n\n🏛️ Was dich erwartet:\nDie Akropolis thront über Athen — ein 2.500 Jahre altes Meisterwerk. Auf Santorini erlebst du den berühmtesten Sonnenuntergang der Welt über der Caldera. Kreta überrascht mit der Samaria-Schlucht, eine der längsten Europas.",
      "\n\n🌊 Deine schönsten Erlebnisse:\nSchwimme in den versteckten Buchten von Milos mit ihrem surreal türkisen Wasser. Besuche das Orakel von Delphi am Fuße des Parnass. Hüpfe von Insel zu Insel mit der Fähre — jede hat ihren eigenen Charakter. Tanze Sirtaki in einer Taverne am Meer.",
      "\n\n🍽️ Kulinarische Highlights:\nProbiere frischen Oktopus, gegrillt über Holzkohle direkt am Hafen. Genieße Moussaka — den Auberginenauflauf der Götter. Trinke Ouzo zu Meze-Platten bei Sonnenuntergang. Koste Loukoumades — süße Honigbällchen als perfektes Dessert.",
      "\n\n🌅 Warum Griechenland perfekt für dich ist:\nGriechenland bietet die perfekte Mischung aus Geschichte, Traumstränden und Gastfreundschaft. Die Griechen leben das 'Siga Siga' — alles mit Ruhe und Genuss.\n\nIch stelle jetzt dein perfektes Griechenland-Paket zusammen...",
    ],
  },
  malediven: {
    emoji: "🏝️",
    title: "Malediven",
    sections: [
      "✨ Willkommen auf den Malediven — dem Paradies auf Erden!\n\nStell dir vor: Dein Wasserüber-Bungalow schwebt über kristallklarem, türkisblauem Wasser. Unter dir gleiten Mantarochen und bunte Rifffische vorbei. Weiße Sandstrände erstrecken sich so weit das Auge reicht, und die Stille wird nur vom sanften Wellenrauschen unterbrochen.",
      "\n\n🏛️ Was dich erwartet:\nJedes Atoll ist eine eigene kleine Welt aus Luxus und Natur. Die Unterwasserwelt gehört zu den reichsten der Erde — Korallenriffe in allen Farben, Walhaie, Delfine und Schildkröten. Nachts leuchtet das Meer biolumineszent am Strand.",
      "\n\n🌊 Deine schönsten Erlebnisse:\nSchnorchle durch Mantarochen-Kanäle im Hanifaru Bay. Genieße ein Dinner unter dem Sternenhimmel auf einer privaten Sandbank. Tauche mit Walhaien im South Ari Atoll. Erlebe eine Spa-Behandlung über dem Meer mit dem Rauschen der Wellen.",
      "\n\n🍽️ Kulinarische Highlights:\nGenieße ein Underwater-Restaurant-Dinner umgeben von Fischen. Probiere Garudhiya — die traditionelle Fischsuppe der Malediver. Frühstücke Champagner und tropische Früchte auf der Terrasse deines Overwater-Bungalows.",
      "\n\n🌅 Warum die Malediven perfekt für dich sind:\nDie Malediven sind der Inbegriff von Luxus und Erholung. Jeder Moment fühlt sich an wie ein Traum — perfekt für Honeymoon, Jubiläum oder einfach die Auszeit deines Lebens.\n\nIch stelle jetzt dein perfektes Malediven-Paket zusammen...",
    ],
  },
  türkei: {
    emoji: "🎈",
    title: "Türkei",
    sections: [
      "✨ Willkommen in der Türkei — wo Orient auf Okzident trifft!\n\nStell dir vor: Du stehst auf der Galata-Brücke in Istanbul, Möwen kreisen über dem Bosporus, und die Silhouetten von Hagia Sophia und Blauer Moschee zeichnen sich gegen den Abendhimmel ab. Der Duft von frischem Simit und türkischem Tee liegt in der Luft.",
      "\n\n🏛️ Was dich erwartet:\nDie Hagia Sophia — 1.500 Jahre alt und immer noch atemberaubend. Kappadokien mit seinen surrealen Feenkaminen und unterirdischen Städten. Die schneeweißen Kalksteinterrassen von Pamukkale. Die antike Stadt Ephesos, eine der besterhaltenen der Welt.",
      "\n\n🌊 Deine schönsten Erlebnisse:\nFahre in einem Heißluftballon über die Feenkamine Kappadokiens bei Sonnenaufgang — unvergesslich! Schwimme in den natürlichen Thermalquellen von Pamukkale. Schlendere über den Großen Basar in Istanbul mit seinen 4.000 Geschäften. Segle entlang der türkischen Riviera auf einem traditionellen Gulet.",
      "\n\n🍽️ Kulinarische Highlights:\nProbiere echten Döner Kebab — nicht wie zu Hause! Genieße ein türkisches Frühstück mit 20 verschiedenen Schälchen. Trinke Çay aus den typischen tulpenförmigen Gläsern. Koste Baklava frisch aus der Kupferpfanne in Gaziantep.",
      "\n\n🌅 Warum die Türkei perfekt für dich ist:\nDie Türkei bietet eine einzigartige Mischung aus europäischem Flair und orientalischem Zauber, antiker Geschichte und modernem Stadtleben — alles zu erstaunlich günstigen Preisen.\n\nIch stelle jetzt dein perfektes Türkei-Paket zusammen...",
    ],
  },
  ägypten: {
    emoji: "🏛️",
    title: "Ägypten",
    sections: [
      "✨ Willkommen in Ägypten — dem Land der Pharaonen!\n\nStell dir vor: Die gewaltigen Pyramiden von Gizeh erheben sich vor dir aus der Wüste, während die Sphinx geheimnisvoll lächelt. Der Nil schlängelt sich wie ein grünes Band durch goldenen Sand, gesäumt von Palmen und jahrtausendealten Tempeln.",
      "\n\n🏛️ Was dich erwartet:\nDas Tal der Könige in Luxor birgt die Gräber der mächtigsten Pharaonen. Der Karnak-Tempel ist die größte religiöse Anlage der Welt. In Kairo pulsiert das moderne Leben direkt neben den Pyramiden. Das Rote Meer leuchtet in unglaublichem Blau.",
      "\n\n🌊 Deine schönsten Erlebnisse:\nFahre mit einer Feluke auf dem Nil bei Sonnenuntergang in Assuan. Tauche in die bunte Unterwasserwelt des Roten Meeres bei Hurghada. Besuche Abu Simbel — die kolossalen Tempel Ramses' II. Reite auf einem Kamel zu den Pyramiden bei Sonnenaufgang.",
      "\n\n🍽️ Kulinarische Highlights:\nProbiere Koshari — Ägyptens Nationalgericht aus Reis, Linsen und Pasta. Genieße frisch gepressten Zuckerrohrsaft auf einem Basar. Trinke starken ägyptischen Kaffee mit Kardamom. Koste Ful Medames zum traditionellen Frühstück.",
      "\n\n🌅 Warum Ägypten perfekt für dich ist:\nÄgypten ist eine Zeitreise — 5.000 Jahre Geschichte treffen auf warmes Meer, endlose Wüste und eine Gastfreundschaft, die dich sofort willkommen heißt.\n\nIch stelle jetzt dein perfektes Ägypten-Paket zusammen...",
    ],
  },
  spanien: {
    emoji: "🇪🇸",
    title: "Spanien",
    sections: [
      "✨ Willkommen in Spanien — dem Land der Leidenschaft!\n\nStell dir vor: Flamenco-Rhythmen hallen durch die Gassen von Sevilla, die Sagrada Família ragt wie ein steinernes Wunder in den blauen Himmel Barcelonas, und an der Costa del Sol küsst die Sonne den Strand bis spät in den Abend.",
      "\n\n🏛️ Was dich erwartet:\nGaudís fantastische Architektur in Barcelona — die Sagrada Família, Park Güell, Casa Batlló. Die Alhambra in Granada, ein maurisches Meisterwerk. Madrids Prado-Museum mit Werken von Velázquez und Goya. Die weißen Dörfer Andalusiens an steilen Berghängen.",
      "\n\n🌊 Deine schönsten Erlebnisse:\nSchlendere über die La Rambla in Barcelona und genieße die Straßenkünstler. Besuche eine authentische Flamenco-Show in Sevilla. Wandere auf dem Jakobsweg durch grüne Landschaften. Surfe die Wellen von San Sebastián an der Atlantikküste.",
      "\n\n🍷 Kulinarische Highlights:\nTeile Tapas und Pintxos in einer Bar in San Sebastián — der Gourmet-Hauptstadt Europas. Genieße Paella direkt am Strand von Valencia. Trinke Sangría auf einer Dachterrasse bei Sonnenuntergang. Probiere Churros con Chocolate zum Frühstück.",
      "\n\n🌅 Warum Spanien perfekt für dich ist:\nSpanien lebt! Die Spanier genießen das Leben wie kaum ein anderes Volk — Essen, Feiern, Kultur und Strand verschmelzen zu einem unvergesslichen Erlebnis.\n\nIch stelle jetzt dein perfektes Spanien-Paket zusammen...",
    ],
  },
  kroatien: {
    emoji: "🏰",
    title: "Kroatien",
    sections: [
      "✨ Willkommen in Kroatien — dem Juwel der Adria!\n\nStell dir vor: Mittelalterliche Stadtmauern umgeben eine märchenhafte Altstadt, darunter glitzert das kristallklare Wasser der Adria in tausend Blautönen. Kiefernwälder duften in der Sommerhitze, und auf den vorgelagerten Inseln findest du einsame Buchten.",
      "\n\n🏛️ Was dich erwartet:\nDubrovniks Altstadt — die 'Perle der Adria' und Drehort von Game of Thrones. Der Diokletianpalast in Split, in dem Menschen seit 1.700 Jahren leben. Die Plitvicer Seen mit ihren smaragdgrünen Wasserfällen, die über Travertin-Terrassen kaskadieren.",
      "\n\n🌊 Deine schönsten Erlebnisse:\nSegle mit einem Boot zu den versteckten Buchten der Inseln Hvar und Brač. Wandere entlang der Stadtmauer von Dubrovnik mit Blick auf die Adria. Schwimme am Zlatni Rat, einem der schönsten Strände Europas. Besuche die Lavendelfelder auf der Insel Hvar.",
      "\n\n🍽️ Kulinarische Highlights:\nProbiere frische Austern in Ston, direkt aus dem Meer. Genieße gegrillten Fisch in einer Konoba am Hafen. Trinke Malvazija-Wein aus Istrien. Koste Peka — langsam unter einer Eisenglocke gegartes Fleisch mit Gemüse.",
      "\n\n🌅 Warum Kroatien perfekt für dich ist:\nKroatien vereint mediterrane Lebensart mit unberührter Natur, historischen Schätzen und einer Küste, die zu den schönsten der Welt gehört — und ist dabei noch ein Geheimtipp.\n\nIch stelle jetzt dein perfektes Kroatien-Paket zusammen...",
    ],
  },
};

/** Try to match a destination from the user's free-text query */
function detectDestination(query: string): { emoji: string; title: string; sections: string[] } | null {
  const q = query.toLowerCase();
  // Aliases / common misspellings
  const ALIASES: Record<string, string> = {
    lisbon: "lissabon", lisboa: "lissabon", portugal: "lissabon",
    "sri lanka": "sri lanka", srilanka: "sri lanka", ceylon: "sri lanka",
    turkey: "türkei", turkei: "türkei", istanbul: "türkei", kappadokien: "türkei",
    egypt: "ägypten", agypten: "ägypten", kairo: "ägypten", hurghada: "ägypten",
    spain: "spanien", barcelona: "spanien", madrid: "spanien", andalusien: "spanien",
    croatia: "kroatien", dubrovnik: "kroatien", split: "kroatien",
    italy: "italien", rom: "italien", rome: "italien", venedig: "italien", florenz: "italien", toskana: "italien", amalfi: "italien",
    greece: "griechenland", santorini: "griechenland", athen: "griechenland", kreta: "griechenland", mykonos: "griechenland",
    maldives: "malediven", maldive: "malediven",
    phuket: "thailand", bangkok: "thailand", "chiang mai": "thailand",
    ubud: "bali", seminyak: "bali", kuta: "bali",
    palma: "mallorca", majorca: "mallorca",
  };

  // Direct match
  for (const key of Object.keys(DESTINATION_GUIDES)) {
    if (q.includes(key)) return DESTINATION_GUIDES[key];
  }
  // Alias match
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (q.includes(alias) && DESTINATION_GUIDES[canonical]) return DESTINATION_GUIDES[canonical];
  }
  return null;
}

/** Build a generic guide when destination isn't in our database */
function buildGenericGuide(query: string): { emoji: string; title: string; sections: string[] } {
  // Try to extract the destination name — take the first capitalized word or phrase
  const destMatch = query.match(/([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*)/);
  // hasDest distinguishes "real destination" from generic fallback wording.
  const hasDest = !!destMatch?.[1];
  const dest = destMatch?.[1] || "Traumziel";
  const closing = hasDest
    ? `\n\n🌅 Warum ${dest} perfekt für dich ist:\nJede Reise verändert uns ein Stück. ${dest} wird dir Momente schenken, die du für immer in deinem Herzen trägst. Die perfekte Mischung aus Abenteuer und Erholung wartet auf dich.\n\nIch stelle jetzt dein perfektes ${dest}-Paket zusammen...`
    : `\n\n🌅 Warum deine Reise besonders wird:\nJede Reise verändert uns ein Stück. Sie wird dir Momente schenken, die du für immer in deinem Herzen trägst. Die perfekte Mischung aus Abenteuer und Erholung wartet auf dich.\n\nIch stelle jetzt dein perfektes Traumziel-Paket zusammen...`;
  return {
    emoji: "🌍",
    title: dest,
    sections: [
      `✨ Dein Abenteuer nach ${dest} beginnt!\n\nStell dir vor: Du steigst aus dem Flugzeug und eine völlig neue Welt empfängt dich. Neue Düfte, neue Farben, neue Klänge — das Abenteuer hat begonnen. Jede Reise beginnt mit dem ersten Schritt, und deiner führt dich an einen besonderen Ort.`,
      `\n\n🏛️ Was dich erwartet:\n${dest} hat seine ganz eigene Magie. Ob historische Sehenswürdigkeiten, atemberaubende Natur oder pulsierende Städte — hier findest du Erlebnisse, die du nie vergessen wirst. Jede Ecke erzählt eine Geschichte, jeder Moment wird zu einer Erinnerung.`,
      `\n\n🌊 Deine schönsten Erlebnisse:\nEntdecke die Highlights der Region wie ein Einheimischer. Besuche die berühmtesten Sehenswürdigkeiten, finde versteckte Geheimtipps und lass dich von der lokalen Kultur inspirieren. Ob Abenteuer, Entspannung oder Kultur — hier ist für jeden etwas dabei.`,
      `\n\n🍽️ Kulinarische Highlights:\nDie lokale Küche ist ein Erlebnis für sich! Probiere authentische Gerichte in kleinen Restaurants, besuche lokale Märkte und entdecke Geschmäcker, die du so noch nie erlebt hast. Essen verbindet — und hier wirst du dich sofort willkommen fühlen.`,
      closing,
    ],
  };
}

function FullScreenTypingLoader({ userQuery }: { userQuery: string }) {
  const [text, setText] = useState("");
  const [sectionIdx, setSectionIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const scrollBoxRef = useRef<HTMLDivElement>(null);

  // Keep narrative short: just the intro section + a closing line.
  const sections = useMemo(() => {
    const base = detectDestination(userQuery) || buildGenericGuide(userQuery);
    const knownTitle = base.title && base.title !== "Traumziel" && base.title !== "dein Traumziel";
    const closingLine = knownTitle
      ? `\n\nIch stelle jetzt dein perfektes ${base.title}-Paket zusammen…`
      : `\n\nIch stelle jetzt dein perfektes Traumziel-Paket zusammen…`;
    return {
      emoji: base.emoji,
      title: base.title,
      sections: [
        base.sections[0] ?? "",
        closingLine,
      ],
    };
  }, [userQuery]);
  const guide = sections;

  useEffect(() => {
    setText("");
    setSectionIdx(0);
    setCharIdx(0);
  }, [guide]);

  useEffect(() => {
    if (sectionIdx >= guide.sections.length) return;

    const section = guide.sections[sectionIdx];
    if (charIdx > section.length) {
      // Move to next section after a brief pause
      const timeout = setTimeout(() => {
        setSectionIdx((i) => i + 1);
        setCharIdx(0);
      }, 400);
      return () => clearTimeout(timeout);
    }

    const interval = setInterval(() => {
      setCharIdx((i) => i + 1);
      setText((prev) => prev + section[charIdx]);
    }, 22);
    return () => clearInterval(interval);
  }, [sectionIdx, charIdx, guide.sections]);

  // Auto-scroll as text grows
  useEffect(() => {
    if (scrollBoxRef.current) {
      scrollBoxRef.current.scrollTop = scrollBoxRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-[#0f1c2e] via-[#162a45] to-[#1a2e4a] px-4 sm:px-6 animate-in fade-in duration-500">
      {/* Floating orbs for atmosphere */}
      <div className="absolute top-[-80px] right-[-60px] h-[300px] w-[300px] rounded-full bg-[#0d9e4f]/10 blur-3xl" />
      <div className="absolute bottom-[-60px] left-[-80px] h-[250px] w-[250px] rounded-full bg-[#2196f3]/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-3xl">
        {/* Header with destination emoji */}
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-3xl backdrop-blur-sm ring-1 ring-white/20 shadow-lg">
            {guide.emoji}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Dein {guide.title} Reiseplan wird erstellt...
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-white/50">
              Unser KI-Reiseexperte erkundet {guide.title} für dich
            </p>
          </div>
        </div>

        {/* Typing area — looks like a document being written */}
        <div
          ref={scrollBoxRef}
          className="min-h-[300px] max-h-[60vh] w-full overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-7 shadow-2xl backdrop-blur-sm"
        >
          <p className="whitespace-pre-wrap text-sm sm:text-[15px] text-white/85 leading-[1.8] font-[system-ui]">
            {text}
            <span className="inline-block h-5 w-0.5 ml-0.5 animate-pulse bg-[#0d9e4f] align-middle rounded-full" />
          </p>
        </div>

        {/* Subtle bottom progress indicator */}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#0d9e4f] to-[#2196f3] transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${Math.min(((sectionIdx + (charIdx / (guide.sections[sectionIdx]?.length || 1))) / guide.sections.length) * 100, 100)}%` }}
            />
          </div>
          <span className="text-[11px] text-white/40 tabular-nums shrink-0">
            {Math.min(Math.round(((sectionIdx + (charIdx / (guide.sections[sectionIdx]?.length || 1))) / guide.sections.length) * 100), 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
