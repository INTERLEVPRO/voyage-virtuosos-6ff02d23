# QA-Bericht: Behebung der bestätigten Befunde

Alle Befunde wurden gegen den aktuellen Code geprüft. F01 wird auf deinen Wunsch zurückgestellt (Telefon-, WhatsApp- und Social-Ziele fehlen noch), die übrigen elf werden behoben. Sprache, Layout und Affiliate-Tracking bleiben unverändert.

## 1. Preisbestätigung wird exakt übernommen (F04)
Heute fragt ein Klick auf "Bestätigen" die KI erneut — der angewendete Preis kann vom gezeigten abweichen. Künftig wird genau das Angebot übernommen, das im Bestätigungsdialog steht. Es wird nichts neu erzeugt.

## 2. Transfer-Buttons (F03)
- Abholort ist künftig das Reiseziel bzw. der Ankunftsflughafen, nie die Abflugstadt.
- Haupt-Button und Tages-Buttons nutzen denselben Weg über die eigene Transferseite mit identischem Kontext; der Affiliate-Marker bleibt erhalten.
- Die stille Vorgabe 12:00 Uhr entfällt; ohne Angabe bleibt das Zeitfeld leer und der Reisende wählt selbst.

## 3. Hotel-Links (F02)
- Die Zielorts-Liste wird um die tatsächlich häufigen Ziele erweitert (u. a. Mallorca/Palma, Bali/Denpasar, Tokio, Bangkok, Phuket, Istanbul, Antalya, Kreta, Barcelona, Rom, New York, Malediven, Singapur, Kapstadt, Marrakesch).
- Unterstützte Parameter (Reisedaten, Personen-/Zimmerzahl) werden mitgegeben, soweit der Anbieter sie akzeptiert.
- Ist kein Zielort zuzuordnen, öffnet der Link eine Suche nach dem Ortsnamen statt der allgemeinen Startseite; darunter ein kurzer Hinweis, dass Termin und Hotel beim Anbieter noch zu wählen sind.

## 4. Klick-Erfassung (F07)
Schlägt das Speichern fehl, meldet die Schnittstelle künftig einen Fehler statt Erfolg und protokolliert ihn. Der Weiterleitungs-Link funktioniert dabei immer weiter. Auch die Tages-Links (Hotel, Aktivitäten, Transfer) werden ab sofort mitgezählt.

## 5. Cookie-/Analyse-Einwilligung (F08)
- Google Analytics startet nicht mehr automatisch. Vor jeder Messung wird der Standard "abgelehnt" gesetzt (Consent Mode v2).
- Ein deutscher Einwilligungs-Banner mit "Alle akzeptieren", "Nur notwendige" und einem Widerruf-Link im Footer; die Wahl wird lokal gespeichert.
- Nur nach Zustimmung wird das Messskript geladen.
- Der Chat-Satz, es würden keine Daten weitergegeben, wird auf eine korrekte Formulierung geändert (Verarbeitung der Reiseangaben durch einen KI-Dienstleister zur Erstellung der Vorschläge).
- Der Banner verlinkt auf eine Datenschutzseite. Da mir dafür keine bestätigten Angaben vorliegen, lege ich vorerst keine erfundenen Inhalte an: der Link zeigt auf das Impressum, bis du mir den Datenschutztext gibst.

## 6. Datumsprüfung (F09)
Unmögliche Datumsangaben (31.02.2027, 2027-13-01) werden abgewiesen statt stillschweigend verschoben. Gültige Daten und Schaltjahre funktionieren unverändert.

## 7. E-Mail-Reiseplan (F12)
Der Transferlink wird vollständig (https://weltweiturlaub.de/transfer?…) ausgegeben, und der Flug-Buchungslink kommt neu hinzu. Der Knopf wird als "E-Mail-Entwurf öffnen" beschriftet.

## 8. Änderungen bleiben erhalten (F11)
Ein angepasstes Paket wird in die Ergebnisliste zurückgeschrieben. Zurückgehen und erneut öffnen zeigt die bestätigte Fassung, auch in der Ergebniskarte.

## 9. Ladebildschirm (F10)
Der Ladetext nutzt das zuletzt genannte Reiseziel. Wechselt jemand von Mallorca auf Bali, steht dort Bali.

## 10. Flughafen-Zuordnung (F05)
Ortsnamen werden zuerst als Orte aufgelöst, erst danach als Flughafencode akzeptiert — und nur, wenn der Code in der hinterlegten Flughafenliste steht. "Goa" führt damit nach Goa (GOI) und nicht nach Genua. Goa und weitere häufig betroffene Orte werden in die Liste aufgenommen.

## 11. Unbelegte Angaben (F06)
- Die Preisaufteilung Flug 32 % / Hotel 50 % / Aktivitäten 13 % / Transfer 5 % entfällt. Angezeigt wird nur der bestätigte Gesamtpreis; echte Einzelpreise werden gezeigt, sobald sie aus Anbieterdaten vorliegen.
- Die Kennzahlen "120+ Reiseziele", "50K+ Pakete erstellt", "4.9★ Bewertung" werden im gleichen Gestaltungsstil durch zutreffende Aussagen ersetzt ("Weltweite Ziele", "Flug + Hotel + Aktivitäten", "Kostenlos & unverbindlich").
- Die Anweisung an die KI, Bewertungen und Bewertungszahlen zu erfinden, wird entfernt; ohne Quelle wird keine Bewertung angezeigt.

## Zurückgestellt
- **F01 Footer-Kontakte:** Telefon, WhatsApp, Facebook und Instagram bleiben vorerst unverändert sichtbar, bis du die echten Ziele lieferst. "Kontakt" und "Datenschutz" zeigen weiterhin auf die Startseite.

## Technische Details
- `src/components/PackageDetail.tsx`: `handleAcceptPrice` wendet `mode.proposal` direkt an; `onPackageUpdated`-Callback an das Elternteil; Transfer-Links vereinheitlicht; ProviderRow ohne Prozent-Rechnung; `buildMailto` mit absoluter Basis-URL und Aviasales-Link; Tages-Links mit `trackClick`.
- `src/routes/index.tsx`: `packages`-State per ID aktualisieren, Callback an `PackageDetail`; StatPill-Werte.
- `src/lib/deeplinks.ts`: `lookupIata` prüft Ortsnamen vor Codes und validiert Codes gegen die Map; `parseStartDate` mit Round-Trip-Prüfung; `KLOOK_HOTEL_DESTINATIONS` erweitert plus Such-Fallback; `buildTransferUrl` nimmt `arrival`/`pickup` statt `origin`; neue `absoluteUrl`-Hilfe.
- `src/routes/transfer.tsx`: keine 12:00-Vorgabe.
- `src/routes/api/track-click.ts`: `error` auswerten, 500 + `{ok:false}` bei Fehlschlag.
- `src/routes/api/refine-package.ts`: `REFINER_SYSTEM` ohne erfundene Ratings.
- `src/routes/__root.tsx` + neue `src/components/ConsentBanner.tsx`, `src/lib/consent.ts`: Consent Mode v2 Default `denied`, gtag erst nach Zustimmung.
- `src/components/ChatPanel.tsx`: Zielerkennung aus dem letzten Nutzerwunsch statt aus dem gesamten Verlauf.

## Tests
Playwright-Durchlauf Desktop (1440) und Mobil (390): Chat Frankfurt → Mallorca, 7 Tage, 2 Personen, 1.500 €, Juni 2027; Paket öffnen, Preisänderung bestätigen, zurück und erneut öffnen, alle Anbieter-Links und E-Mail-Entwurf prüfen; Zielwechsel auf Bali; Einwilligungs-Banner akzeptieren/ablehnen und Netzwerkverkehr prüfen. Dazu Einzelprüfungen der Hilfsfunktionen (Datum, IATA, Hotel-Link, Tracking-Fehlerfall). Abschluss: Tabelle mit Befund-ID, geänderten Dateien, Fix, Test und Ergebnis.
