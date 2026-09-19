# Live-QA behoben: Reiseziel, Budget, Transfer, Kalender

Die Sprache, der Chat-Ablauf, das Layout und alle Partner-Links inklusive Provisions-Kennung bleiben unverändert. Es werden keine Daten erfunden.

## 1. Reiseziel bleibt erhalten (BUG-001, kritisch)

Bestätigt im Code: Kurzantworten werden wie ein neues Reiseziel gelesen.
- „insgesamt" wird als Ziel übernommen, weil es keine Sperrliste für Antwortwörter gibt.
- „Reiseziel ist Sri Lanka" liefert „Ist, Sri Lanka", weil das Wort „ist" nach „Reiseziel" mit in den Namen wandert.

Änderung:
- Sperrliste für Antwort- und Füllwörter (insgesamt, gesamt, pro Person, ja, nein, ok, danke, ist, sind, richtig, stimmt, korrekt, alles …). Solche Wörter werden nie zu einem Reiseziel.
- Füllwörter direkt hinter „Reiseziel/Ziel" („ist", „wäre", „soll sein", „=") werden abgeschnitten, bevor der Name gelesen wird.
- Ein einmal erkanntes Reiseziel bleibt bestehen, solange eine neue Nachricht kein gültiges neues Ziel nennt. Kurze Rückfragen-Antworten ändern nur das Feld, um das es geht (z. B. Budgetart).

## 2. Datum wird nicht mehr als Budget gelesen (BUG-002, kritisch)

Bestätigt: aus „15.06.2027" liest der Betragsleser „6.202 €".

Änderung: Datumsangaben (TT.MM.JJJJ, TT/MM/JJJJ, JJJJ-MM-TT und Zeiträume) werden aus dem Text entfernt, bevor Beträge gesucht werden. Zusätzlich braucht eine Zahl ein Währungszeichen oder ein Budget-Wort in der Nähe, damit sie als Budget zählt.

Geprüft wird mit: 1.500 € + 15.06.2027 bis 22.06.2027, 2.500 € insgesamt, „Budget 900", reine Datumsangaben ohne Budget.

## 3. Ein geprüftes Reiseziel für alle Folgelinks (BUG-004)

Vor der Paketerstellung wird das Reiseziel geprüft. Enthält es ein Sperrwort oder ist es unklar, fragt der Assistent freundlich nach, statt Pakete, Karten, Hotel-/Aktivitäts-Suchen, Transfer und E-Mail-Text mit einem falschen Namen zu füllen. Titel, Karten, Klook-Suchen, Kiwitaxi-Startort und E-Mail nutzen denselben geprüften Namen.

## 4. Transferseite: Personenzahl und sichtbares Ergebnis (BUG-003)

- Die Personenzahl wird auf allen Wegen zur Transferseite mitgegeben und dort beibehalten.
- Lädt das Transferfenster nicht (Skriptfehler oder nach ein paar Sekunden weiterhin leer), erscheint statt der leeren Fläche ein klarer Hinweis mit Reisedaten und Direktlink zum Anbieter.
- Ohne gültiges Reiseziel wird kein Transferfenster mit unsinnigen Angaben aufgebaut.

## 5. Kalender auf Deutsch (BUG-006)

Der Kalender im Chat bekommt deutsche Wochentage (Mo Di Mi Do Fr Sa So) und deutsche Vorlesetexte.

## 6. Aussagen, die nicht belegt sind

- „Direktflug" auf den Paketkarten wird zu derselben neutralen Formulierung wie in der Detailansicht, solange kein Anbieter einen Direktflug bestätigt.
- „Support 24/7" entfällt, weil aktuell nur E-Mail-Kontakt besteht.

## 7. Mehrtägige Rundreisen mit einem Hotel (BUG-005)

Nennt der Reiseplan mehrere weit auseinanderliegende Orte, wird das Paket entweder als Rundreise mit mehreren Übernachtungsorten geplant oder die Tage werden auf Ausflüge begrenzt, die vom gewählten Hotel aus wirklich machbar sind. Umgesetzt über die Vorgaben an die Planung plus eine Prüfung vor der Anzeige.

## Technische Details

- `src/routes/api/chat.ts`: `parseBudgetValue` — Datumsmuster vorab entfernen, Währungs-/Keyword-Nähe verlangen; `extractDestination` — Sperrwortliste (`STOP_DESTINATION_WORDS`), Kopulen nach `reiseziel|ziel` entfernen, leere/ungültige Kandidaten überspringen statt zurückgeben; Ziel aus dem vorhandenen Dialog-Status beibehalten, wenn die neue Nachricht keins nennt; Validierung des Ziels vor `buildPackages`/Research; Itinerary-Prompt um Übernachtungslogik ergänzen.
- `src/components/ChatPanel.tsx`: `Calendar` mit `locale={de}` aus `date-fns/locale`.
- `src/components/PackageCard.tsx`: „Direktflug" → neutrale Formulierung; `src/components/PackageDetail.tsx`: 24/7-Aussage entfernen, `pax` in allen Transfer-Links mitgeben.
- `src/routes/transfer.tsx`: Mount-Überwachung des Widgets (Skript-`onerror` + Timeout), Fallback-Karte mit Reisedaten und `KIWI_TAXI_AFFILIATE_URL`; `pax` bleibt in der URL erhalten.
- Kleine Regressionstests als Skript für Budget- und Zielerkennung (Dateien unter `scripts/`).

## Tests

TypeScript-Prüfung sowie Chat-Durchläufe Sri Lanka (mit „insgesamt" und „Nein. Reiseziel ist Sri Lanka.") und Mallorca (Budget + deutsche Datumsangabe) auf Desktop (1280) und Mobil (390), dazu Transferseite mit und ohne Personenzahl und der Kalender. Abschluss: Tabelle mit Befund, Dateien, Fix, Test und Ergebnis.
