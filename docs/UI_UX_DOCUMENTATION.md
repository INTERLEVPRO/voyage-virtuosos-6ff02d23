# UI / UX Documentation

Design system: Tailwind CSS v4 tokens defined in `src/styles.css`, shadcn/ui components in `src/components/ui`, Radix primitives, `lucide-react` icons, `sonner` for toasts. All user-facing copy is German.

---

## `/` — Homepage (`src/routes/index.tsx`)
- **Purpose:** entry point; hosts the whole planning flow (chat → results → detail).
- **Auth required:** no.
- **Key components:** `SiteHeader`, `StatPill`, `FeatureChip`, `ChatPanel`, `PackageResults`, `PackageDetail`, `FloatingIcons`, `Footer`.
- **Sections:** animated hero with 12 deterministic particles (`HERO_PARTICLES`, generated with `Math.sin` so SSR and hydration match), chat composer, SEO text section linking to `/buchen`, `/register`, `/impressum`, and a disclaimer stating the operator is not a travel agency or tour operator.
- **Head:** canonical `https://weltweiturlaub.de/`, OG/Twitter tags, `hreflang de-DE`, JSON-LD.
- **State:** the route owns `packages` and `selectedPackage`; `ChatPanel` raises `onPackagesReady`, `PackageResults` raises `onSelect`.

### Chat (`ChatPanel.tsx`)
- Textarea composer plus send button; responses stream in token by token from `/api/chat`.
- A date-range calendar popover (`react-day-picker`) is scrollable with a fixed footer holding "Übernehmen" / "Zurücksetzen"; sized for mobile.
- While packages are generated, a loading screen with a progress bar is shown; the bar is capped at 96 % and the results are revealed with a short delay.
- The structured payload arrives as a fenced ```json block inside the stream and is parsed client-side.

### Results (`PackageResults.tsx`)
- Back button "Neuen Reisewunsch starten".
- Heading "Hier sind deine 3 persönlichen Pakete" plus the note that prices include flights, hotel and activities.
- Summary chips: duration, travelers, origin ("Ab …"), budget — falling back to "—" / "Abflugort offen" / "Budget berücksichtigt".
- A vertical grid of three `PackageCard`s and a footer note that only German reviews are shown.

### Package card (`PackageCard.tsx`)
Shows tier, title, destination, price, rating, match score, badges and a select action.

### Package detail (`PackageDetail.tsx`)
- Full itinerary per day, hotel and flight description, activities, badges, ratings (only ratings that carry a URL are displayed), destination imagery via `PlaceImage.tsx`, `AgentBadge`.
- Booking buttons open affiliate links (a single window on mobile); the "Flughafen-Transfer" button points to the Kiwitaxi affiliate URL.
- `DayWeatherPanel.tsx` requests `/api/itinerary-weather` and renders per-day condition, min/max temperature, rain chance, clothing hints and a tip.
- `RefineComposer.tsx` offers quick chips ("Anderes Hotel", "Günstiger machen", "Mehr Luxus", "Mehr Aktivitäten") plus a free-text textarea; the send control is icon-only below `sm` and labelled `aria-label="Senden"`; inputs are disabled while loading.
- `PriceConfirmation.tsx` appears when the API answers `needs_confirmation`, showing old price, new price and the difference before the change is applied.

---

## `/buchen` (`src/routes/buchen.tsx`)
- **Purpose:** intended booking step. Currently static text ("Deine Buchungsdaten werden hier verarbeitet…") plus a back link. No form, validation or payment.
- **Auth required:** no. **Head:** canonical, OG tags, BreadcrumbList JSON-LD.

## `/transfer` (`src/routes/transfer.tsx`)
- **Purpose:** airport transfer booking through the Kiwitaxi white-label widget.
- **Behaviour:** loads `https://widget-white-label.kiwitaxi.com/js/index.js` into a `data-kiwitaxi-white-label` container with marker `728432`; accepts `from`, `to`, `country`, `pax`, `date` search params. Robots: `noindex,follow`.
- **Auth required:** no.

## `/login` (`src/routes/login.tsx`)
- Email/password sign-in form against Supabase auth; errors are surfaced in German. Head with canonical, OG and BreadcrumbList JSON-LD. Auth required: no.

## `/register` (`src/routes/register.tsx`)
- Email/password sign-up form against Supabase auth; a `profiles` row is created by a DB trigger. Auth required: no.

## `/impressum` (`src/routes/impressum.tsx`)
- Legal imprint content, including the statement that the operator is not a travel agency/tour operator.

## `/sitemap.xml`
- Machine-only XML response, not a UI page.

## Global layout (`src/routes/__root.tsx`)
- Root document, global head metadata, GA4 tag `G-BYSENCWW5P`, providers (`AuthProvider`, React Query), and `<Outlet />`.
- `Footer.tsx`: German menu labels and social links; "Kontakt" and "Datenschutz" currently link to `/`.

## Responsive behaviour
- Mobile-first Tailwind classes throughout; `use-mobile.tsx` provides a breakpoint hook.
- `src/styles.css` sets `overflow-x: clip`, `overscroll-behavior-x: none` and `touch-action: pan-y` to stop horizontal drift on touch devices.
- Enlarged touch targets on chat and calendar controls; the refine send button collapses to an icon on small screens.

## Validation & error surfaces
- Client: empty/whitespace input is not submitted; controls are disabled while a request is in flight.
- Server: all API payloads are Zod-validated; German error messages are returned for invalid requests, missing AI backend, and failed generation.
