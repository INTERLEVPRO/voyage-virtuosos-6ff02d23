# Folge-QA: Die sieben offenen Punkte beheben

Sprache, Layout, Chat-Ablauf und die Partner-Verlinkung (inkl. Tracking) bleiben unverändert. Es werden keine erfundenen Daten ergänzt.

## 1. Keine erfundenen Bewertungen mehr (F06)
Die Paketerstellung vergibt heute feste Werte: 4,2 / 320 Bewertungen (Basic), 4,5 / 980 (Medium), 4,8 / 1840 (Premium) sowie Hotelnoten 8,2 / 8,7 / 9,3 von 10, wenn der Text keine Note enthält. Diese Vorgaben entfallen ersatzlos.
- Ohne geprüfte Quelle wird keine Note und keine Bewertungszahl angezeigt.
- Nur die tatsächlich recherchierten Bewertungen mit Quellenangabe bleiben sichtbar; sie werden bereits so behandelt.
- Die Angabe "passt zu deinen Wünschen" (matchScore) bleibt davon getrennt bestehen.

## 2. Hotel-Links (F02)
Es werden keine Klook-Kennungen erfunden. Bestätigte Ziele (Dubai, Chennai, Kochi, Colombo, Mumbai) behalten ihre Zielseite. Für alle anderen Orte wird geprüft und sichergestellt, dass der Link eine ortsbezogene Hotelsuche öffnet — mit Hotelname, Ort, Reisedaten, Personen- und Zimmerzahl, soweit der Anbieter sie übernimmt — und niemals eine allgemeine Startseite. Geprüft an Dubai, Colombo, Mallorca, Tokio und Bali.

## 3. Datenschutztext nennt den richtigen Fluganbieter
Im Impressum steht heute "Kiwi.com, KiwiTaxi, Klook". Flüge laufen aber über Aviasales. Der Text nennt künftig: Aviasales (Flüge), Klook (Hotels und Aktivitäten), Kiwitaxi (Transfers).

## 4. Buchungsseite mit echter Funktion
Die Seite "Buchung" zeigt künftig das ausgewählte Reisepaket statt eines Platzhaltertextes:
- Paketname, Reiseziel, Reisedauer, Personenzahl und Gesamtpreis.
- Vier Weiterleitungen mit den vorhandenen Reisedaten vorbelegt: Flug (Aviasales), Hotel (Klook), Aktivitäten (Klook), Transfer (Kiwitaxi). Die Klick-Erfassung läuft wie bei den übrigen Links mit.
- Deutlicher Hinweis: Buchung und Zahlung erfolgen direkt beim jeweiligen Partner; Weltweiturlaub.de wickelt keine Zahlung ab.
- Ohne übergebenes Paket erscheint ein freundlicher Hinweis mit Weg zurück zur Reiseplanung.

## 5. Unmögliche Transfer-Daten abweisen
Die Transferseite hat eine eigene Datumsumwandlung, die `?date=31.02.2027` stumm zu `2027-02-31` macht. Sie nutzt künftig dieselbe strenge Prüfung wie der Rest der Seite; ungültige Angaben werden verworfen und kein ungültiges Datum an das Transferfenster übergeben. Geprüft: 31.02.2027, 29.02.2027, 31.04.2027 abgelehnt; 29.02.2028 und 30.04.2027 angenommen.

## 6. Fußzeilen-Symbole wieder sichtbar
Telefon, WhatsApp, Facebook und Instagram erscheinen wieder im gewohnten Stil, aber bewusst ohne Ziel (nicht anklickbar, dezent abgesetzt, mit Hinweis "folgt"). Es werden keine Nummern oder Profile erfunden. Die bestätigte E-Mail `contact@interlev.com` bleibt aktiv.

## 7. Google-Anmeldung behält das Ziel
Die Anmeldung über Google kehrt heute immer zur Startseite zurück. Künftig wird das gewünschte Ziel (z. B. `/buchen`) über die Anmeldung hinweg gemerkt und danach angesteuert. Nur interne Seiten sind erlaubt; fremde Adressen werden ignoriert und führen zur Startseite.

## Technische Details
- `src/routes/api/chat.ts`: feste `rating`/`reviews`-Werte je Paketstufe entfernen, Hotel-Fallbacknote (`8.2/8.7/9.3`) entfernen, Note nur übernehmen, wenn sie im Quelltext steht.
- Anzeigeseiten (`PackageCard`, `PackageDetail`, `package-schema`, `types/travel`): `rating`/`reviews` optional, Blöcke nur bei vorhandenen Werten rendern.
- `src/lib/deeplinks.ts`: Suchfallback für Hotels verifizieren/schärfen (Ort + Hotel + Daten + Gäste), Kartierung unverändert lassen.
- `src/routes/impressum.tsx`: Anbieterliste korrigieren.
- `src/routes/buchen.tsx`: Suchparameter für Paketkontext (Ziel, Hotel, Datum/Monat, Dauer, Personen, Preis, Paket-ID), Links über `deeplinks`-Bauer, `trackClick` je Klick; Verlinkung aus `PackageDetail`/`PackageCard` mit diesen Parametern.
- `src/routes/transfer.tsx`: `parseStartDate`/`isValidCalendarDate` aus `src/lib/deeplinks.ts` verwenden statt eigener Umwandlung.
- `src/components/Footer.tsx`: Symbolleiste mit inaktiven Icons (`aria-disabled`, kein `href`), E-Mail aktiv.
- `src/routes/login.tsx`: `redirect_uri` auf `${origin}/login?redirect=…` (interne Pfadprüfung: beginnt mit `/`, kein `//`), nach OAuth-Rückkehr dorthin navigieren.

## Tests
TypeScript-Prüfung und Playwright-Durchlauf Desktop (1280) und Mobil (390): Chat-Ablauf Frankfurt → Mallorca, Paket öffnen, alle Anbieter-Links, Buchungsseite mit echtem Paket, Hotel-Links für Dubai/Colombo/Mallorca/Tokio/Bali, Transferdaten-Fälle, Google-Weiterleitungsfälle. Abschluss: Tabelle mit Befund, Dateien, Fix, Test und Ergebnis.
