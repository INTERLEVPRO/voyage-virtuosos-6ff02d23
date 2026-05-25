## Problem

Die „Route"-Buttons (Header + jeder Tag) öffnen Google Maps mit `origin=My+Location`. Das funktioniert in Google Maps nicht zuverlässig — Maps ignoriert den Parameter oft und zeigt kein Ziel oder eine leere Route. Deshalb wirkt der Button „kaputt".

## Lösung

Vor dem Öffnen den echten Standort des Nutzers per Browser-Geolocation-API holen und als `origin=lat,lng` in die Google-Maps-URL einsetzen. Wenn der Nutzer den Standort ablehnt oder kein GPS hat, fallen wir auf eine URL **ohne** `origin` zurück — dann fragt Google Maps selbst nach dem Startpunkt (das ist viel zuverlässiger als `My+Location`).

## Änderungen

**Datei:** `src/components/PackageDetail.tsx`

1. `mapsRouteUrl(destination, place?)` so anpassen, dass es optional `origin` (z. B. `"48.13,11.57"`) entgegennimmt. Ohne `origin` wird der Parameter weggelassen.
2. Neuer Helper `openRouteInMaps(destination, place?)`:
   - Versucht `navigator.geolocation.getCurrentPosition` (Timeout 6 s, kein hochpräziser Modus).
   - Bei Erfolg: öffnet die URL mit `origin=lat,lng`.
   - Bei Ablehnung/Fehler/Timeout: öffnet die URL ohne `origin` (Google fragt dann selbst).
   - Öffnet immer in neuem Tab (`window.open(url, "_blank", "noopener")`).
3. Die zwei `<a href={mapsRouteUrl(...)}>`-Stellen (Header-Button Zeile ~263, Tag-Karten-Button Zeile ~457) bleiben Anker-Tags mit `target="_blank"`, bekommen aber zusätzlich einen `onClick`, der `e.preventDefault()` macht und `openRouteInMaps(...)` aufruft. So gibt es einen sinnvollen `href`-Fallback (Rechtsklick / „in neuem Tab öffnen") und der normale Klick nutzt den echten Standort.

Keine weiteren Dateien betroffen, keine Backend-/Schema-Änderungen.