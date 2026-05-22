import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, Sparkles, MessageCircle } from "lucide-react";
import type { TravelPackage, PackagesPayload } from "@/types/travel";

const STARTER_PROMPTS = [
  "Mallorca, 7 Tage, 2 Personen, Budget 1500€, Strand & Entspannung, Abflug Frankfurt",
  "Städtetrip Lissabon, 4 Tage, 1200€, Kunst & gutes Essen, Abflug München",
  "Bali Honeymoon, 10 Tage, 5000€, Wellness & Strand, Abflug Berlin",
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
  autoSendPrompt,
}: {
  onPackagesReady?: (pkgs: TravelPackage[]) => void;
  autoSendPrompt?: string;
}) {
  const transport = new DefaultChatTransport({ api: "/api/chat" });
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const [stageIdx, setStageIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const handedOffRef = useRef<Set<string>>(new Set());
  const autoSentRef = useRef(false);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (autoSendPrompt && !autoSentRef.current) {
      autoSentRef.current = true;
      sendMessage({ text: autoSendPrompt });
    }
  }, [autoSendPrompt, sendMessage]);

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
    <div className="flex h-[640px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold text-foreground">Lass uns starten</div>
          <div className="text-xs text-muted-foreground">Erzähl mir kurz von deinem Traumurlaub.</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-secondary/30 px-5 py-6">
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="text-base font-semibold text-foreground">Wohin soll deine Reise gehen?</p>
            <p className="text-sm text-muted-foreground">
              Reiseziel, Budget, Dauer, Stil — je mehr du erzählst, desto besser passen die 3 Pakete.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => submit(p)}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
                  {p}
                </button>
              ))}
            </div>
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="font-medium">{AGENT_STAGES[stageIdx]}</span>
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
        className="flex items-end gap-2 border-t border-border bg-card p-4"
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
          rows={1}
          placeholder="Beschreibe deinen Traumurlaub…"
          className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Senden
        </button>
      </form>
    </div>
  );
}
