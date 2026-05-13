import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, Sparkles } from "lucide-react";

const STARTER_PROMPTS = [
  "Paris trip, 1000€ budget, 4 days, lover of art & coffee",
  "Honeymoon in Bali, 5000€, 10 days, beach & wellness",
  "Tokyo solo trip, 2500€, 7 days, food & design",
];

const AGENT_STAGES = [
  "Concierge listening…",
  "Research agent scouting flights & stays…",
  "Budget agent crafting your tiers…",
  "Itinerary architect drawing your days…",
  "Persona agent weaving the story…",
];

export function ChatPanel() {
  const transport = new DefaultChatTransport({ api: "/api/chat" });
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const [stageIdx, setStageIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const submit = (text: string) => {
    if (!text.trim() || isLoading) return;
    sendMessage({ text: text.trim() });
    setInput("");
  };

  return (
    <div className="flex h-[640px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-luxe">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary to-[oklch(0.4_0.07_200)] px-5 py-4 text-primary-foreground">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-gold">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="font-display text-lg leading-tight">Weltweit Urlaub Atelier</div>
          <div className="text-xs opacity-80">A team of AI agents at your service</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {messages.length === 0 && (
          <div className="space-y-4">
            <p className="font-display text-xl text-primary">Where shall we send you?</p>
            <p className="text-sm text-muted-foreground">
              Describe your dream trip — destination, budget, length, vibe. Our agents will compose a bespoke proposal.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => submit(p)}
                  className="rounded-xl border border-border bg-secondary/50 px-4 py-3 text-left text-sm text-secondary-foreground transition-colors hover:border-accent hover:bg-secondary"
                >
                  ✦ {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={
                  isUser
                    ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm text-primary-foreground shadow-soft"
                    : "max-w-[90%] rounded-2xl rounded-tl-sm border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
                }
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{text}</p>
                ) : (
                  <div className="prose-luxe">
                    <ReactMarkdown>{text || "…"}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
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
        className="flex items-end gap-2 border-t border-border bg-background/60 p-4"
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
          placeholder="Describe your dream trip…"
          className="flex-1 resize-none rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold text-primary shadow-soft transition-transform hover:scale-105 disabled:opacity-50"
          aria-label="Send"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
