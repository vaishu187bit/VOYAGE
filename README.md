# VOYAGE — NearbyQuest 🧭

**Problem Statement: 4 — Open Innovation (Student Pain Points)**

---

## What it does

VOYAGE is a location-based travel discovery and itinerary planner built for students visiting new cities. Type any city or landmark — or tap **Detect My Location** — and instantly get a personalised itinerary of the top places within 10 km, complete with estimated cab/auto fares, best visiting times, entry fees, and one-tap Ola & Uber booking links.

**The student pain point it solves:** When students travel to new cities for internships, college fests, or trips, they waste time figuring out what's nearby, struggle with fare estimation, and juggle multiple apps. VOYAGE brings discovery, itinerary planning, and ride booking into a single tool.

---

## Done / Left / Plan

### What works right now
- City search with autocomplete suggestions (Nominatim)
- **Auto geolocation** — detects your current location, asks for permission politely with a step-by-step guide modal if denied
- Fetches up to 100 nearby places within 10 km via Overpass API (OpenStreetMap)
- Category filters: Attractions, Historic, Nature, Parks, Food, Shopping, Religious, Hotels
- Place cards with: icon, category, distance, address, entry fee, best visiting time
- **Estimated cab fares** (Auto, Ola, Uber XL) calculated from actual distance
- **One-tap booking** — each fare tile opens Ola or Uber with pickup & destination pre-filled
- Interactive Leaflet map with dark theme, place markers and popups
- Day-wise itinerary grouping (Day 1 Top Picks, Day 2 Explore More, etc.)
- Print itinerary button
- Fully responsive (mobile + desktop)
- Error handling: permission denied, location unavailable, API timeout, network error

### What is left / being improved
- Add a Save Favourites feature (localStorage)
- Share itinerary via link
- Add walking/transit time estimates
- Improve place photo thumbnails

### Plan to finish
| Time | Task |
|------|------|
| Now  | Push to GitHub, enable GitHub Pages |
| +1hr | Add favourites (localStorage) |
| +2hr | Add share-by-link feature |
| +3hr | Final polish, mobile testing, live URL |

---

## Architecture and Why

`
User Browser
    │
    ├── index.html     — Structure, layout, modals
    ├── style.css      — Dark glassmorphism UI, all animations
    └── app.js         — All logic (no framework, no build step)
            │
            ├── Nominatim API  (geocoding & autocomplete)
            │   https://nominatim.openstreetmap.org
            │   → Free, no key, 1 req/sec limit respected
            │
            ├── Overpass API   (place data from OpenStreetMap)
            │   https://overpass-api.de (with 2 mirror fallbacks)
            │   → Free, no key, queries nodes/ways/relations
            │
            ├── Browser Geolocation API
            │   → Native, no cost, user-permission based
            │
            └── Leaflet.js     (interactive map)
                CartoDB Dark tiles (free, no key)
`

**Why no framework?** The project is 3 files, zero build steps, and deploys by just opening index.html. Zero setup friction — runs on any laptop instantly, which matters in a hackathon.

**Why OpenStreetMap / Overpass?** Fully free, no API keys, global data, and richer POI data than many paid alternatives for tourism/historic/nature categories.

**Why Ola/Uber deep links?** Instead of just showing fare estimates (like Google Maps), we remove the friction of manually entering the destination — one tap and the ride app opens with everything pre-filled.

---

## What We Added (Beyond the Brief)

| Feature | Why it is useful |
|---------|-----------------|
| Auto Geolocation with permission modal | Students don't need to type their location; step-by-step modal guides them if browser blocks location |
| Live Ola + Uber booking tiles | Removes 3 manual steps — no copy-pasting addresses |
| 3-mirror Overpass fallback | If one server is slow, silently retries — no error seen by user |
| Day-wise itinerary grouping | Makes a raw list feel like an actual travel plan |
| Entry fee + best time badges | Helps students plan budget and schedule before visiting |
| Animated progress loader | Communicates each step (geocoding → fetching → processing) clearly |
| Print itinerary | Students can print or PDF their plan offline |
| Keyboard & Escape support | Modal closes on Escape; search triggers on Enter |

---

## How to Run It

### Local (no install needed)
`ash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
# Just open index.html in any browser
start index.html       # Windows
open index.html        # Mac
`

### Live URL
> 🌐 **https://vaishu187bit.github.io/VOYAGE**

No login required. No API keys needed.

---

## Tools and APIs Used

| Tool / API | Purpose | Cost |
|------------|---------|------|
| [Nominatim (OpenStreetMap)](https://nominatim.openstreetmap.org) | City geocoding + autocomplete | Free, no key |
| [Overpass API](https://overpass-api.de) | Fetch nearby places from OSM | Free, no key |
| [Leaflet.js](https://leafletjs.com) | Interactive map rendering | Free, open-source |
| [CartoDB Dark Tiles](https://carto.com) | Dark map tile theme | Free |
| [Browser Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) | Detect user location | Native, free |
| [Ola Deep Link](https://book.olacabs.com) | Pre-fill pickup+drop for Ola | Free link |
| [Uber Deep Link](https://m.uber.com/ul) | Pre-fill pickup+drop for Uber | Free link |
| Outfit + Playfair Display (Google Fonts) | Typography | Free |

**AI transparency:** This app does not include any AI-generated content shown to users. All place data comes from OpenStreetMap contributors.

---

## Who It Is For

**Primary users:** College students visiting a new city for internships, fests, trips, or interviews.

**Why they would come back:**
- Zero setup — works immediately on any device
- Saves 20–30 minutes of what's nearby? research every trip
- Fare tiles with direct Ola/Uber booking saves the hassle of copy-pasting addresses
- The itinerary can be printed and taken offline

**Evidence of need:** See [evidence/survey_results.md](evidence/survey_results.md) — 87.5% of surveyed students have missed a place in a new city, 100% wanted direct ride-booking from discovery results.

---

## Student Problem Evidence

See the [evidence/](evidence/) folder for:
- Survey results (8 students surveyed)
- Key quotes from respondents
- Problem validation summary

**Key numbers:**
- 87.5% struggle to find places in new cities
- 100% would use a direct Ola/Uber booking button
- 87.5% have missed a good spot due to lack of awareness
- 62.5% find fare estimation stressful

---

*Built with ❤️ using only free, open APIs. No API keys. No build steps. Just open and explore.*
