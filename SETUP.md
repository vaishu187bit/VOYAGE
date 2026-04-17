# NearbyQuest – Database & Backend Setup

## Project Structure

```
quest/
├── index.html          ← Frontend (unchanged)
├── style.css           ← Styles (updated with auth/toast UI)
├── app.js              ← Frontend logic (updated with auth hooks)
├── api.js              ← NEW: Frontend ↔ Backend API client
│
├── database/
│   └── init.sql        ← NEW: Run this once to create all MySQL tables
│
└── server/             ← NEW: Node.js / Express backend
    ├── server.js       ← Main app entry point (port 3001)
    ├── db.js           ← MySQL connection pool
    ├── package.json
    ├── .env.example    ← Copy to .env and fill in credentials
    └── routes/
        ├── auth.js         ← /api/auth/*
        ├── places.js       ← /api/places/*
        └── itineraries.js  ← /api/itineraries/*
```

---

## Step 1 – Set Up MySQL Database

1. Open **MySQL Workbench** or your MySQL client.
2. Run the schema file:
   ```sql
   SOURCE x:/quest/database/init.sql;
   ```
   This creates the `nearbyquest` database and all 6 tables.

---

## Step 2 – Configure Environment Variables

```bash
cd x:\quest\server
copy .env.example .env
```

Open `.env` and fill in:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=nearbyquest
SERVER_PORT=3001
```

---

## Step 3 – Start the Backend Server

```bash
cd x:\quest\server
npm run dev     # development (auto-restarts on change)
# OR
npm start       # production
```

The API will be available at: **http://localhost:3001**
Health check: http://localhost:3001/api/health

---

## Step 4 – Open the Frontend

Serve the frontend as before:
```bash
cd x:\quest
npx serve -p 8080
```

Then open **http://localhost:8080** in your browser.

---

## What's New

| Feature | Description |
|--------|-------------|
| **User Accounts** | Register & login via the header "Sign In" button |
| **Save Places** | Logged-in users can bookmark any place card (🔖 Save) |
| **Search History** | Every search auto-saved to MySQL when logged in |
| **Itinerary Saving** | `apiSaveItinerary()` available to save full day plans |
| **API Cache** | Overpass API results cached in MySQL for 6 hours |
| **Toast Alerts** | Smooth pill-shaped toast notifications for all actions |

---

## API Reference

| Method | Endpoint | Auth? | Description |
|--------|----------|-------|-------------|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Login, returns session token |
| POST | `/api/auth/logout` | ✅ | Invalidate session |
| GET | `/api/auth/me` | ✅ | Get current user |
| GET | `/api/places/saved` | ✅ | List saved places |
| POST | `/api/places/saved` | ✅ | Save a place |
| DELETE | `/api/places/saved/:id` | ✅ | Remove a saved place |
| GET | `/api/places/history` | ✅ | Recent searches |
| GET | `/api/places/cache` | ❌ | Check cached API results |
| POST | `/api/places/cache` | ❌ | Store API results |
| GET | `/api/itineraries` | ✅ | List itineraries |
| POST | `/api/itineraries` | ✅ | Save itinerary with stops |
| GET | `/api/itineraries/:id` | ✅ | Get itinerary details |
| DELETE | `/api/itineraries/:id` | ✅ | Delete itinerary |
