import { useState } from "react";
import { Send, Loader2 } from "lucide-react";

const QUICK_CHIPS = [
  "Anderes Hotel",
  "Günstiger machen",
  "Mehr Luxus",
  "Mehr Aktivitäten",
];

export function RefineComposer({
  onSubmit,
  loading,
}: {
  onSubmit: (text: string) => void;
  loading: boolean;
}) {
  const [text, setText] = useState("");

  const send = (value: string) => {
    const v = value.trim();
    if (!v || loading) return;
    onSubmit(v);
    setText("");
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-secondary/30 p-4">
      <p className="text-sm font-medium text-primary">
        Was möchtest du ändern?
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Zum Beispiel: anderes Hotel, günstiger, mehr Aktivitäten…
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            disabled={loading}
            onClick={() => send(c)}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground transition-colors hover:border-accent hover:bg-secondary/40 disabled:opacity-50"
          >
            {c}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="mt-3 flex items-end gap-2"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Beschreibe deine Wünsche…"
          rows={2}
          disabled={loading}
          className="flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-gold px-4 text-sm font-medium text-primary shadow-soft disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Senden
        </button>
      </form>
    </div>
  );
}
