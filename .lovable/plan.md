## Problem
Im Screenshot fehlt eine Pflichtangabe: **Anzahl Reisende**. Der Concierge fragt nur nach dem Reisezeitraum und springt dann direkt zur Paketerstellung ("Perfekt — ich lasse mein Team…"), obwohl noch echte Daten fehlen.

Grund: `isPlanningRequest` in `src/routes/api/chat.ts` prüft nur **Budget + Ziel/Art + Wortzahl**. Reisedauer, Anzahl Reisende, Abflughafen und Zeitraum werden NICHT geprüft → Planung startet zu früh, der Concierge fragt fehlende Felder nicht mehr ab.

## Fix (nur `src/routes/api/chat.ts`)

### 1. `isPlanningRequest` strenger machen
Alle 6 Pflichtfelder müssen im Verlauf vorkommen, sonst bleibt der Concierge im Frage-Modus:

- **Budget**: `\d{2,5}\s?(€|eur|euro)` ODER Wort "budget"
- **Ziel ODER Urlaubsart**: bestehende Regex
- **Dauer**: `\d+\s?(tag|tage|nacht|nächte|woche|wochen)`
- **Reisende**: `\d+\s?(person|personen|erwachsene|reisende|gäste)` ODER "allein"/"solo"/"paar"/"familie"
- **Abflughafen**: "ab/von/abflug" + Ort, oder bekannte Flughafencodes/Städte-Heuristik (`ab\s+\w+` / `abflug\s+\w+` / `von\s+\w+`)
- **Reisezeitraum**: Monat/Saison/relativ/"flexibel"/"egal" (Liste von Keywords: januar…dezember, frühling, sommer, herbst, winter, nächst…, in \d+ monat…, flexibel, egal)

Nur wenn **alle 6** matchen → Planung startet.

### 2. Concierge-Prompt schärfen
Klare Anweisung: nenne in EINER Nachricht **kurz und gebündelt** die noch fehlenden Felder als Liste (nicht eins nach dem anderen), z. B.:
> "Super, fast alles da! Mir fehlen noch zwei Kleinigkeiten: **Wie viele Personen reisen?** und **wann ungefähr** (Monat/Saison/"flexibel")?"

Außerdem: NIEMALS "Perfekt — ich lasse mein Team…" sagen, solange noch ein Pflichtfeld fehlt.

### 3. Verhalten im Beispielfall
Eingabe "Städtetrip Lissabon, 4 Tage, 1200€, Kunst & gutes Essen, Abflug München" + "june" →
fehlt noch: **Anzahl Reisende**.
Concierge fragt: *"Eine letzte Frage: Wie viele Personen reisen mit?"*
Erst danach startet die Paketerstellung.

## Out of scope
- Keine UI-Änderungen (kein Date-Picker, keine Chips).
- Keine Änderungen an Packager / Research / Refine / Weather.
- Keine DB- oder Schema-Änderungen.
