## Badge-Text auf natürlicheres Deutsch umstellen

In `src/components/PackageCard.tsx` (Zeilen 68–73) ist der „Top bewertet"-Badge aktuell mit dem Untertitel **„Echte deutsche Reviews"** beschriftet. „Reviews" ist Anglizismus.

### Vorschlag (Empfehlung)
- Titel: **Top bewertet**
- Untertitel: **Echte Bewertungen aus Deutschland**

### Alternativen (falls kürzer gewünscht)
1. „Top bewertet" / **„Echte Kundenbewertungen"**
2. „Top bewertet" / **„Echte Erfahrungen"**
3. „Bestens bewertet" / **„Echte Bewertungen"**

### Konsistenz
Im Hero (`src/routes/index.tsx`) steht aktuell der Trust-Chip „Top bewertet — Echte Reviews". Diesen passe ich im selben Schritt an die gewählte Variante an, damit Badge + Hero gleich klingen.

Sonst keine weiteren Änderungen.

**Welche Variante soll ich nehmen — Empfehlung (1), Alt 1, Alt 2 oder Alt 3?**