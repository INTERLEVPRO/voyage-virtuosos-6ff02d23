import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Sparkles, MessageCircle, ShieldCheck } from "lucide-react";
import type { TravelPackage, PackagesPayload } from "@/types/travel";

const QUICK_SUGGESTIONS = [
  "Mallorca",
  "Städtetrip",
  "Bali Honeymoon",
  "Familienurlaub",
  "All Inclusive",
  "Ab Frankfurt",
];


const AGENT_STAGES = [
  "Concierge hört zu…",
  "Research-Agent sucht Flüge & Hotels…",
  "Budget-Agent erstellt 3 Pakete…",
  "Itinerary-Architekt plant deine Tage…",
  "Pakete werden zusammengestellt…",
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

export function ChatPanel({
  onPackagesReady,
}: {
  onPackagesReady?: (pkgs: TravelPackage[]) => void;
}) {
  const transport = new DefaultChatTransport({ api: "/api/chat" });
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const [stageIdx, setStageIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const handedOffRef = useRef<Set<string>>(new Set());

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (status === "submitted") {
      setStageIdx(0);
      const id = setInterval(() => {
        setStageIdx((i) => (i + 1) % AGENT_STAGES.length);
      }, 1800);
      return () => clearInterval(id);
    }
  }, [status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [status]);

  // Detect packages_ready in the latest assistant message (only when streaming has finished)
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
  };

  return (
    <div className="flex h-[70vh] min-h-[520px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card sm:h-[640px]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold text-foreground">KI-Reiseassistent</div>
          <div className="text-xs text-muted-foreground">Online · antwortet in Sekunden</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-secondary/30 px-5 py-6">
        {messages.length === 0 && (
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
              Lass uns starten <span aria-hidden>👋</span>
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Erzähl mir kurz, wohin du reisen möchtest — ich stelle dir passende Pakete zusammen.
            </p>
          </div>
        )}

        {messages.map((m) => {
          const raw = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
          const display = m.role === "assistant" ? stripJsonBlock(raw) : raw;
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={
                  isUser
                    ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm text-primary-foreground shadow-soft"
                    : "max-w-[90%] rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 text-sm text-foreground shadow-soft"
                }
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{display}</p>
                ) : (
                  <div className="prose-luxe">
                    <ReactMarkdown>{display || "…"}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">Planung läuft…</span>
              <span className="text-xs text-muted-foreground">{AGENT_STAGES[stageIdx]}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error.message}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); submit(input); }}
        className="flex flex-col gap-3 border-t border-border bg-card p-3 sm:p-4"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          placeholder="Schreib mir deinen Reisewunsch… z. B. 7 Tage Mallorca, 2 Personen, Budget 1.500 €"
          className="min-h-[110px] max-h-[200px] w-full resize-none rounded-[18px] border border-input bg-background px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          disabled={isLoading}
        />

        <div className="flex flex-wrap gap-2">
          {QUICK_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInput((prev) => (prev ? `${prev}, ${s}` : s))}
              disabled={isLoading}
              className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Deine Daten sind sicher und werden nicht weitergegeben.
          </p>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02] disabled:opacity-50 sm:w-auto"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            <span>Paket finden</span>
          </button>
        </div>
      </form>

    </div>
  );
}
