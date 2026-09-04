# Workflows

## 1. Travel brief → three packages
```text
User opens /
        ↓
User types a free-text travel wish in the chat
        ↓
ChatPanel POSTs the message history to /api/chat (streaming fetch)
        ↓
Server extracts destination, origin, duration, budget, travelers, timeframe, interests
        ↓
Missing field? → stream a German follow-up question → back to user input
        ↓
Budget < 100 € ? → stream a German hint asking for a realistic budget
        ↓
All fields present → stream a confirmation summary of the brief
        ↓
User confirms
        ↓
Parallel AI calls: research (flights/hotels) + itinerary  [12 s timeout each]
   (trips longer than 14 days skip the AI itinerary and use the deterministic builder)
        ↓
buildPackagesFromResearch → packageSchema validation → tier assignment (basic/medium/premium)
        ↓
Optional ratings lookup via Firecrawl [raced against 5 s]
        ↓
Insert trip_requests row, then insert 3 packages rows (failures are non-fatal)
        ↓
Stream: German intro text + fenced JSON { status: "packages_ready", packages: [...] }
        ↓
ChatPanel parses the JSON, waits out the loading progress, calls onPackagesReady
        ↓
PackageResults renders the three cards
```

## 2. Package detail and weather
```text
User clicks a package card
        ↓
index.tsx sets selectedPackage → PackageDetail renders
        ↓
DayWeatherPanel POSTs { destination, days, startDate } to /api/itinerary-weather
        ↓
Server geocodes with Open-Meteo, fetches the forecast, maps WMO codes to German conditions,
generates clothing hints and a travel tip
        ↓
Per-day weather is rendered next to the itinerary
```

## 3. Package refinement with price gate
```text
User enters a change request (chip or free text) in RefineComposer
        ↓
POST /api/refine-package { selectedPackage, changeRequest, userConfirmedBudget: false, tripBrief }
        ↓
Change request looks like "regenerate all packages"? → status "rejected" + hint to start a new chat
        ↓
AI produces the full refined package + changeSummary → packageSchema validation
        ↓
|newPrice - oldPrice| >= 30 € and not confirmed?
        ├─ yes → status "needs_confirmation" → PriceConfirmation shows old/new/difference
        │          ↓ user confirms → same request again with userConfirmedBudget: true
        └─ no  → continue
        ↓
Package id is a UUID? → update the packages row (title, price, rating, match_score, summary, data)
        ↓
status "updated" → UI replaces the package and shows the German change summary
```

## 4. Affiliate hand-off
```text
User clicks a booking button (flight / hotel / activities / transfer)
        ↓
Deep link is built by src/lib/deeplinks.ts (IATA mapping, marker 728432)
        ↓
POST /api/track-click { packageId?, provider, url }
        ↓
Server validates with Zod, stores package_id only when it is a UUID,
inserts into affiliate_clicks via the service-role client
        ↓
Browser opens the provider URL
```

## 5. Registration and sign-in
```text
User opens /register → enters email + password
        ↓
supabase.auth.signUp
        ↓
DB trigger on_auth_user_created → handle_new_user() inserts a profiles row
        ↓
onAuthStateChange fires in AuthProvider → session stored, React Query and the router invalidated
        ↓
User is signed in (no route is gated behind authentication)
```

## 6. Airport transfer
```text
User opens /transfer (optionally with from|to|country|pax|date search params)
        ↓
Kiwitaxi white-label script is injected into the widget container (marker 728432)
        ↓
Search and booking happen inside the third-party widget
```
