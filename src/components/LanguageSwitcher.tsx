import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  variant = "header",
  className,
}: {
  variant?: "header" | "footer";
  className?: string;
}) {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "de").slice(0, 2);

  const change = (lng: "de" | "en") => {
    void i18n.changeLanguage(lng);
    try {
      document.documentElement.lang = lng;
    } catch {
      // ignore
    }
  };

  if (variant === "footer") {
    return (
      <div className={cn("inline-flex items-center gap-1 text-xs", className)}>
        <Globe className="h-3 w-3 opacity-70" />
        <button
          type="button"
          onClick={() => change("de")}
          className={cn(
            "rounded px-1.5 py-0.5 transition-colors",
            current === "de"
              ? "font-semibold text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={current === "de"}
        >
          DE
        </button>
        <span className="text-muted-foreground/50">·</span>
        <button
          type="button"
          onClick={() => change("en")}
          className={cn(
            "rounded px-1.5 py-0.5 transition-colors",
            current === "en"
              ? "font-semibold text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={current === "en"}
        >
          EN
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card p-0.5 text-xs shadow-soft",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => change("de")}
        className={cn(
          "rounded-full px-2.5 py-1 font-medium transition-colors",
          current === "de"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={current === "de"}
      >
        DE
      </button>
      <button
        type="button"
        onClick={() => change("en")}
        className={cn(
          "rounded-full px-2.5 py-1 font-medium transition-colors",
          current === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={current === "en"}
      >
        EN
      </button>
    </div>
  );
}
