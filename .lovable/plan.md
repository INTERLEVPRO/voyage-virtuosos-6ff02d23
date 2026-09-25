# Fix hotel, activity and transfer booking links

Flight links (Aviasales) stay exactly as they are.

## What the code does now
- **Hotel (Klook):** only 6 cities (Dubai, Chennai, Kochi, Colombo, Mumbai) have a fixed Klook destination page. Every other destination falls back to a Klook keyword search (`/search/result/?keyword=...`). That search page ignores check-in/out and guest count, so dates and travellers are lost, and without a keyword it goes to the generic Klook hotels homepage.
- **Activities (Klook):** also a keyword search. It sends the Travelpayouts API token as `aid` instead of the affiliate marker, and the dates are not applied by Klook.
- **Transfer (Kiwitaxi):** the button opens the fixed short link `kiwitaxi.tpm.li/RgYDJiUT` (you asked for this earlier). That short link drops every parameter, so no route, date or passenger count arrives.

## Plan
1. **Check what actually happens first.** Open each current link for 3 test trips (Dubai, Mallorca, Bali — 2 people, 7 days, fixed date) in a real browser and record where each one lands and which details show. Also check which URL formats Klook really accepts for dates and guests (destination page, hotel search, activity search).
2. **Hotels:** switch to the Klook URL format that keeps dates, adults and rooms (confirmed in step 1). Use the hotel name + city when a hotel is known, the city otherwise. Extend the list of verified Klook destination pages only with pages confirmed to open (no guessed IDs). Never send people to the generic hotels homepage when a destination exists.
3. **Activities:** use the correct affiliate marker (728432), the city, and dates in a format Klook accepts; open the city's activity page when confirmed, otherwise a city search.
4. **Transfer:** keep your Kiwitaxi partner link, but open it with the trip details (arrival airport, hotel/city, date, passengers) through Kiwitaxi's own supported parameters with marker 728432. If Kiwitaxi only accepts the short link without details, fall back to our transfer page (which shows the Kiwitaxi booking window pre-filled) — I will tell you which one works.
5. **Same links everywhere:** the package detail page, package cards and the `/buchen` page all use the same link builders, so they stay consistent. Click tracking stays unchanged.
6. **Test:** for all 3 trips, open hotel, activities and transfer links in the browser and confirm the right destination/hotel, dates and traveller count appear. Confirm the flight link is byte-for-byte unchanged. Type check with no errors.

## Technical details
- Files: `src/lib/deeplinks.ts` (`buildKlookSearchUrl`, `buildKlookActivitiesUrl`, `KLOOK_HOTEL_DESTINATIONS`, transfer link builder), `src/components/PackageDetail.tsx` (transfer button currently hardcodes `KIWI_TAXI_AFFILIATE_URL`), `src/routes/buchen.tsx`.
- `buildAviasalesSearchUrl` and flight buttons are not touched.
- No invented Klook IDs or data; only URL formats and pages confirmed by the browser test are used.
