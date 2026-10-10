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
- **Auto geolocation** — detects current location; step-by-step permission modal if browser blocks it
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

### What is left for the next 16 hours
- Add a Save Favourites feature (localStorage)
- Share itinerary via link or WhatsApp
- Add walking / transit time estimates
- Improve place photo thumbnails via Wikimedia API

### Plan to finish
| Time | Task |
|------|------|
| +1 hr | Add favourites (localStorage) |
| +2 hr | Add share-by-link feature |
| +3 hr | Wikimedia photo thumbnails on cards |
| +4 hr | Final mobile testing, live URL in README, submission |

---

## Architecture and Why

`
User Browser
    │
    ├── index.html  — Structure, layout, modals
    ├── style.css   — Dark glassmorphism UI, all animations
    └── app.js      — All logic (no framework, no build step)
            │
            ├── Nominatim API  (geocoding & autocomplete)
            │   https://nominatim.openstreetmap.org
            │   → Free, no key, 1 req/sec limit respected
            │
            ├── Overpass API   (place data from OpenStreetMap)
            │   https://overpass-api.de  (+ 2 mirror fallbacks)
            │   → Free, no key, queries nodes/ways/relations
            │
            ├── Browser Geolocation API
            │   → Native browser API, user-permission based
            │
            └── Leaflet.js  +  CartoDB Dark Tiles
                → Interactive map, free, no key required
`

**Why no framework?** The project is 3 files with zero build steps. It runs instantly on any laptop — no 
pm install, no config. This is critical for a hackathon demo.

**Why OpenStreetMap / Overpass?** Fully free, no API keys, global coverage, and richer POI data (tourism, historic, nature) than many paid alternatives.

**Why Ola/Uber deep links?** Instead of just showing estimates like Google Maps, we eliminate 3 manual steps — one tap and the ride app opens with everything pre-filled.

---

## What We Added (Beyond the Brief)

| Feature | Why it is useful |
|---------|--------------------|
| Auto Geolocation + permission modal | Students don't need to type their location; guided modal if browser blocks |
| One-tap Ola + Uber booking tiles | Removes friction — no copy-pasting addresses into ride apps |
| 3-mirror Overpass API fallback | If one server is slow, silently retries — no user-visible error |
| Day-wise itinerary grouping | Turns a raw list into an actual multi-day travel plan |
| Entry fee + best-time badges | Helps students budget and schedule before visiting |
| Animated progress loader with stages | Shows exactly what's happening: geocoding → fetching → processing |
| Print itinerary button | Students can PDF or print their plan for offline use |
| Keyboard & Escape key support | Modal closes on Escape; search fires on Enter — fully keyboard navigable |

---

## How to Run It

### Local (no install needed)
`ash
git clone https://github.com/vaishu187bit/VOYAGE.git
cd VOYAGE
# Just open index.html in any browser — no server needed
start index.html    # Windows
open index.html     # Mac / Linux
`

### Live URL
> 🌐 **https://vaishu187bit.github.io/VOYAGE**

No login required. No API keys needed. Works on mobile and desktop.

---

## Tools and APIs Used

| Tool / API | Purpose | Cost |
|------------|---------|------|
| [Nominatim (OpenStreetMap)](https://nominatim.openstreetmap.org) | City geocoding + autocomplete | Free, no key |
| [Overpass API](https://overpass-api.de) | Fetch nearby places from OSM | Free, no key |
| [Leaflet.js](https://leafletjs.com) | Interactive map rendering | Free, open-source |
| [CartoDB Dark Tiles](https://carto.com) | Dark map tile theme | Free |
| [Browser Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) | Detect user GPS location | Native, free |
| [Ola Deep Link](https://book.olacabs.com) | Pre-fill pickup + drop for Ola | Free link |
| [Uber Deep Link](https://m.uber.com/ul) | Pre-fill pickup + drop for Uber | Free link |
| Outfit + Playfair Display (Google Fonts) | Typography | Free |

**AI transparency:** This app does not use or display any AI-generated content to users. All place data comes from OpenStreetMap community contributors.

---

## Who It Is For

**Primary users:** College students visiting a new city for internships, fests, trips, or job interviews.

**Why they would come back:**
- Zero setup — works immediately on any device, no account needed
- Saves 20–30 minutes of scattered searching every trip
- One-tap Ola/Uber booking removes the copy-paste frustration
- Day-wise itinerary feels like a real travel plan, not a raw list
- Works offline once loaded (cached map tiles)

---

## Problem Definition

**Who has the problem:** College students (1st–4th year) who visit unfamiliar cities for internships, fests, interviews, or trips — roughly every Indian college student at some point.

**What it costs them:**
- 20–30 minutes wasted per trip doing scattered searching across Google Maps, Instagram, and WhatsApp groups
- Money lost due to no fare awareness before booking — students often overpay
- Missed experiences — popular spots go unvisited simply because the student didn't know they existed

**Why existing tools fall short:**

| Tool | What it lacks |
|------|--------------|
| Google Maps | Shows everything but doesn't curate, rank by relevance, or estimate fares |
| MakeMyTrip / TripAdvisor | Designed for tourists, not student budgets; no real-time ride cost |
| Instagram / YouTube | Passive discovery, no actionable itinerary or directions |
| Ola / Uber | Ride booking only — no discovery of where to go first |

**VOYAGE combines all of this in one free, zero-login tool** — discovery + itinerary + fare estimate + one-tap booking.

---

## How Our Solution Differs

| Feature | Google Maps | TripAdvisor | VOYAGE |
|---------|-------------|-------------|--------|
| Discover places near any city | ✅ | ✅ | ✅ |
| Day-wise itinerary plan | ❌ | ✅ (paid) | ✅ Free |
| Fare estimate (Auto/Ola/Uber) | ⚠️ Rough | ❌ | ✅ Calculated |
| One-tap Ola/Uber booking | ❌ | ❌ | ✅ Pre-filled |
| Works without an account | ✅ | ❌ | ✅ |
| Entry fees + best visit time | ❌ | ⚠️ | ✅ |
| Auto-detect GPS location | ✅ | ❌ | ✅ With modal |
| 100% free, no API key | ❌ | ❌ | ✅ |

---

## Signs Students Would Use It

**From our survey (8 students, evidence folder):**
- **100%** said they would use a direct Ola/Uber booking button from a discovery tool
- **87.5%** have missed a good place in a new city because they didn't know it existed
- **87.5%** said they would use a combined discovery + itinerary + booking tool
- **62.5%** find fare estimation stressful before booking a ride in an unfamiliar city

**Direct student quotes:**
> *I always waste 30 mins figuring out what's nearby when I reach a new place.* — 3rd year CS student

> *Knowing the auto fare before I go would save so much stress.* — 2nd year student

> *I missed the famous lake near my internship city because no one told me.* — Final year student

> *One app that combines discovery + booking would be a game changer.* — 2nd year student

> *Google Maps shows everything but doesn't tell me what's worth visiting.* — 1st year student

See full survey in [evidence/survey_results.md](evidence/survey_results.md)

---

## Our Pitch

> **Every year, thousands of Indian students land in an unfamiliar city with no plan.**
> They open Google Maps — and get overwhelmed. They ask friends — and miss half the spots.
> They open Ola to book a ride — but have no idea where to go first, or what it'll cost.
>
> **VOYAGE solves this in one tap.** Type your city, and in seconds you get a full day-wise
> itinerary of the best nearby places — with entry fees, best visiting times, and a direct
> Book Ola / Book Uber button that opens the app with your destination already filled in.
>
> No account. No API key. No install. Just open and explore.

---

## Student Problem Evidence

See the [evidence/](evidence/) folder for full survey results, quotes, and problem validation.

**Key numbers:**
- 87.5% struggle to discover places in new cities
- 100% would use a direct Ola/Uber booking button
- 87.5% have missed a good spot due to lack of awareness
- 62.5% find fare estimation stressful before booking

---

*Built with ❤️ using only free, open APIs. No API keys. No build steps. Just open and explore.*
