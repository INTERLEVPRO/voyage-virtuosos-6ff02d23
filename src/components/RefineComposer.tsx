import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Send, Loader2 } from "lucide-react";

export function RefineComposer({
  onSubmit,
  loading,
}: {
  onSubmit: (text: string) => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState("");

  const chips: { label: string; key: "otherHotel" | "cheaper" | "moreLuxury" | "moreActivities" }[] = [
    { key: "otherHotel", label: t("detail.quickActions.otherHotel") },
    { key: "cheaper", label: t("detail.quickActions.cheaper") },
    { key: "moreLuxury", label: t("detail.quickActions.moreLuxury") },
    { key: "moreActivities", label: t("detail.quickActions.moreActivities") },
  ];

  const send = (value: string) => {
    const v = value.trim();
    if (!v || loading) return;
    onSubmit(v);
    setText("");
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-secondary/30 p-4">
      <p className="text-sm font-medium text-primary">{t("refine.title")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t("refine.hint")}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            disabled={loading}
            onClick={() => send(t(`detail.quickRequests.${c.key}`))}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground transition-colors hover:border-accent hover:bg-secondary/40 disabled:opacity-50"
          >
            {c.label}
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
          placeholder={t("refine.placeholder")}
          rows={2}
          disabled={loading}
          className="min-w-0 flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          aria-label={t("common.send")}
          className="flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-gold text-sm font-medium text-primary shadow-soft disabled:opacity-50 sm:w-auto sm:px-4"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{t("common.send")}</span>
        </button>
      </form>
    </div>
  );
}
