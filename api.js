/* ═══════════════════════════════════════════════════════════════
   NearbyQuest – api.js  (frontend helper)
   Thin wrapper for all calls to the Express/MySQL backend.
   Include this BEFORE app.js in index.html.
═══════════════════════════════════════════════════════════════ */

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocalhost ? 'http://localhost:3001/api' : '/api';

/* ─── Session token storage ──────────────────────────────────── */
const NQ = {
  getToken : () => localStorage.getItem('nq_token'),
  setToken : (t) => localStorage.setItem('nq_token', t),
  clearToken: () => localStorage.removeItem('nq_token'),
  getUser  : () => JSON.parse(localStorage.getItem('nq_user') || 'null'),
  setUser  : (u) => localStorage.setItem('nq_user', JSON.stringify(u)),
  clearUser: () => localStorage.removeItem('nq_user'),
};

/* ─── Base fetch with auth header ────────────────────────────── */
async function apiFetch(path, opts = {}) {
  const token = NQ.getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['x-session-token'] = token;
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    return res.ok ? { ok: true, data: await res.json() }
                  : { ok: false, data: await res.json() };
  } catch {
    return { ok: false, data: { error: 'Network error – is the server running?' } };
  }
}

/* ════════════════════════════════════════════════════════════════
   AUTH
════════════════════════════════════════════════════════════════ */
async function apiRegister(username, email, password) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

async function apiLogin(email, password) {
  const r = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (r.ok) { NQ.setToken(r.data.token); NQ.setUser(r.data.user); }
  return r;
}

async function apiLogout() {
  await apiFetch('/auth/logout', { method: 'POST' });
  NQ.clearToken(); NQ.clearUser();
}

async function apiGetMe() {
  return apiFetch('/auth/me');
}

/* ════════════════════════════════════════════════════════════════
   SAVED PLACES
════════════════════════════════════════════════════════════════ */
async function apiGetSaved() {
  return apiFetch('/places/saved');
}

/**
 * Save a place object (as produced by processPlaces in app.js).
 * Maps app.js field names → server field names automatically.
 */
async function apiSavePlace(place) {
  return apiFetch('/places/saved', {
    method: 'POST',
    body: JSON.stringify({
      overpass_id  : place.id,
      name         : place.name,
      category     : place.category,
      category_id  : place.categoryId,
      latitude     : place.lat,
      longitude    : place.lon,
      dist_label   : place.distLabel,
      entry_fee    : place.entryFee?.label,
      best_time    : place.bestTime,
      address      : place.address,
      maps_url     : place.mapsUrl,
      directions_url: place.directionsUrl,
      wiki_url     : place.wikiUrl,
    }),
  });
}

async function apiUnsavePlace(dbId) {
  return apiFetch(`/places/saved/${dbId}`, { method: 'DELETE' });
}

/* ════════════════════════════════════════════════════════════════
   SEARCH HISTORY
════════════════════════════════════════════════════════════════ */
async function apiRecordSearch(query, lat, lon) {
  if (!NQ.getToken()) return; // skip if not logged in
  return apiFetch('/places/history', {
    method: 'POST',
    body: JSON.stringify({ query, latitude: lat, longitude: lon }),
  });
}

async function apiGetHistory(limit = 10) {
  return apiFetch(`/places/history?limit=${limit}`);
}

/* ════════════════════════════════════════════════════════════════
   PLACE CACHE (backend-side)
════════════════════════════════════════════════════════════════ */
async function apiCheckCache(lat, lon, radius = 10000) {
  return apiFetch(`/places/cache?lat=${lat}&lon=${lon}&radius=${radius}`);
}

async function apiStoreCache(lat, lon, places, radius = 10000) {
  return apiFetch('/places/cache', {
    method: 'POST',
    body: JSON.stringify({ lat, lon, radius, places }),
  });
}

/* ════════════════════════════════════════════════════════════════
   ITINERARIES
════════════════════════════════════════════════════════════════ */
async function apiGetItineraries() {
  return apiFetch('/itineraries');
}

/**
 * Save the currently displayed itinerary.
 * @param {string} title - custom name for the trip
 * @param {string} cityName - display name of searched city
 * @param {number} lat - center latitude
 * @param {number} lon - center longitude
 * @param {Array}  stops - allPlaces array from app.js
 */
async function apiSaveItinerary(title, cityName, lat, lon, stops) {
  return apiFetch('/itineraries', {
    method: 'POST',
    body: JSON.stringify({
      title,
      city_name : cityName,
      center_lat: lat,
      center_lon: lon,
      radius_m  : 10000,
      stops,
    }),
  });
}

async function apiGetItinerary(id) {
  return apiFetch(`/itineraries/${id}`);
}

async function apiDeleteItinerary(id) {
  return apiFetch(`/itineraries/${id}`, { method: 'DELETE' });
}

/* ════════════════════════════════════════════════════════════════
   UI STATE HELPER – call once on page load
════════════════════════════════════════════════════════════════ */
function nqInitAuthUI() {
  const user = NQ.getUser();
  const bar = document.getElementById('auth-bar');
  if (!bar) return;
  if (user) {
    bar.innerHTML = `
      <span class="auth-welcome">👋 ${esc ? esc(user.username) : user.username}</span>
      <button class="auth-btn" onclick="(async()=>{ await apiLogout(); nqInitAuthUI(); })()">Sign Out</button>
    `;
  } else {
    bar.innerHTML = `
      <button class="auth-btn" onclick="document.getElementById('auth-modal').classList.remove('hidden')">Sign In / Register</button>
    `;
  }
}
