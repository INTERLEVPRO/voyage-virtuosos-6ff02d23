# Plan: "Plan per E-Mail senden" → direkter Versand an angemeldete User-Mail

Aktuell öffnet der Button nur `mailto:` (Mail-Programm vom User). Du möchtest, dass beim Klick die Mail **automatisch sofort** an die Mail-Adresse des eingeloggten Users gesendet wird.

## Was sich ändert

### 1. E-Mail-Infrastruktur einrichten (Lovable Emails)
- Du brauchst eine verifizierte Sender-Domain (z. B. `weltweiturlaub.de` oder Subdomain wie `mail.weltweiturlaub.de`).
- Setup-Dialog wird angezeigt → DNS-Einträge eintragen → Domain verifiziert.
- Email-Infrastruktur (Queue, Send-Log, Worker) wird automatisch deployed.

### 2. Server Function `sendPlanEmail`
- Neue Datei: `src/lib/send-plan.functions.ts`
- Geschützt mit `requireSupabaseAuth` → nur eingeloggte User können senden.
- Holt die User-E-Mail aus `context.claims.email` (kein Input-Feld nötig).
- Rendert ein React-Email-Template mit Plan-Daten (Hotel, Flug, Tag-für-Tag, Maps-Links, Buchungs-Links).
- Queued die Mail über die Lovable Emails Send-API.

### 3. Button in `PackageDetail.tsx`
- `<a href={buildMailto(...)}>` → `<button onClick={handleSendEmail}>`.
- Beim Klick:
  - Wenn nicht eingeloggt → Hinweis "Bitte erst einloggen" + Link zu `/login`.
  - Wenn eingeloggt → Server-Function aufrufen → Toast "Plan wurde an deine@mail.com gesendet ✓".
- Loading-State während Versand, Fehler-Toast bei Problemen.
- `buildMailto` Helper entfernt.

## Was du brauchst
- Eine Domain, die du verifizieren kannst (DNS-Zugriff). Falls keine vorhanden → wir können erst den Setup-Dialog öffnen und du sagst Bescheid wenn fertig.

## Nicht im Scope
- Mail an andere Adressen senden (Freunde, Familie) → könnten wir später als optionales Eingabefeld nachrüsten.
- HTML-Mail-Design polish — erstmal sauberes Standard-Template, dann iterieren.

Soll ich loslegen? Falls ja, starte ich mit dem Domain-Setup-Dialog.
