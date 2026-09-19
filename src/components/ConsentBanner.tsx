import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { applyConsent, readConsent, restoreConsent } from "@/lib/consent";

/**
 * Cookie-/Analyse-Banner. Google Analytics startet erst nach "Alle akzeptieren".
 * Ohne Entscheidung werden keine Analyse-Cookies gesetzt.
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = restoreConsent();
    if (!stored) setVisible(true);
    const onOpen = () => setVisible(true);
    window.addEventListener("wwu:open-consent", onOpen);
    return () => window.removeEventListener("wwu:open-consent", onOpen);
  }, []);

  if (!visible) return null;

  const decide = (value: "granted" | "denied") => {
    applyConsent(value);
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[200] border-t border-border bg-card/98 p-4 shadow-luxe backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Wir verwenden nur technisch notwendige Cookies. Mit deiner Zustimmung nutzen wir
          zusätzlich Google Analytics, um die Seite zu verbessern. Du kannst deine Entscheidung
          jederzeit im Fußbereich ändern. Mehr dazu in unserem{" "}
          <Link to="/impressum" className="underline">
            Impressum &amp; Datenschutz
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide("denied")}
            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
          >
            Nur notwendige
          </button>
          <button
            type="button"
            onClick={() => decide("granted")}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-soft"
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}

/** Link im Footer, um die Auswahl erneut zu öffnen. */
export function ConsentSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("wwu:open-consent"))}
      className={className}
    >
      Cookie-Einstellungen
    </button>
  );
}

export { readConsent };
