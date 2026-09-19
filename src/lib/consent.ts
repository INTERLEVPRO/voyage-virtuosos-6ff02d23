/**
 * Einwilligungs-Verwaltung (DSGVO).
 *
 * Google Analytics wird erst geladen, wenn die Besucherin bzw. der Besucher
 * ausdrücklich zugestimmt hat. Vorher gilt Consent Mode v2 mit "denied".
 */

export const GA_MEASUREMENT_ID = "G-BYSENCWW5P";
const STORAGE_KEY = "wwu-consent-v1";

export type ConsentValue = "granted" | "denied";

type Gtag = (...args: unknown[]) => void;

function getGtag(): Gtag | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: Gtag };
  if (!w.dataLayer) w.dataLayer = [];
  if (!w.gtag) {
    w.gtag = function gtag(...args: unknown[]) {
      w.dataLayer!.push(args);
    };
  }
  return w.gtag!;
}

/** Gespeicherte Entscheidung lesen ("granted" | "denied" | null = noch offen). */
export function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function storeConsent(value: ConsentValue) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* Speicherung blockiert — Entscheidung gilt dann nur für diese Sitzung. */
  }
}

let gaLoaded = false;

function loadGoogleAnalytics() {
  if (gaLoaded || typeof document === "undefined") return;
  gaLoaded = true;
  const gtag = getGtag();
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
  gtag?.("js", new Date());
  gtag?.("config", GA_MEASUREMENT_ID, { anonymize_ip: true });
}

/** Entscheidung anwenden (und optional dauerhaft speichern). */
export function applyConsent(value: ConsentValue, persist = true) {
  const gtag = getGtag();
  gtag?.("consent", "update", {
    analytics_storage: value,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  if (persist) storeConsent(value);
  if (value === "granted") loadGoogleAnalytics();
}

/** Beim Start: bereits erteilte Einwilligung wiederherstellen. */
export function restoreConsent() {
  const stored = readConsent();
  if (stored) applyConsent(stored, false);
  return stored;
}

/** Einwilligung widerrufen — Analytics bleibt bis zum Neuladen deaktiviert. */
export function revokeConsent() {
  applyConsent("denied");
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignorieren */
  }
}
