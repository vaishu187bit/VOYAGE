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
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { ok: false, data: errData };
    }
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, data: { error: 'Network error' } };
  }
}

/* ════════════════════════════════════════════════════════════════
   AUTH (With Seamless LocalStorage Fallback for Static GitHub Pages)
════════════════════════════════════════════════════════════════ */
async function apiRegister(username, email, password) {
  // First attempt remote server (if hosted backend is running)
  try {
    const r = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    if (r.ok) return r;
  } catch (e) { /* fallback below */ }

  // Graceful client-side fallback: ensures Registration ALWAYS succeeds
  const mockToken = 'mock-jwt-' + Date.now();
  const mockUser = { id: Date.now(), username, email };
  const users = JSON.parse(localStorage.getItem('nq_mock_users') || '[]');
  
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, data: { error: 'An account with this email already exists' } };
  }
  
  users.push({ ...mockUser, password });
  localStorage.setItem('nq_mock_users', JSON.stringify(users));
  
  NQ.setToken(mockToken);
  NQ.setUser(mockUser);
  return { ok: true, data: { token: mockToken, user: mockUser } };
}

async function apiLogin(email, password) {
  try {
    const r = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (r.ok) {
      NQ.setToken(r.data.token);
      NQ.setUser(r.data.user);
      return r;
    }
  } catch (e) { /* fallback below */ }

  // Graceful client-side fallback
  const users = JSON.parse(localStorage.getItem('nq_mock_users') || '[]');
  const match = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  
  if (match) {
    const mockToken = 'mock-jwt-' + Date.now();
    const mockUser = { id: match.id, username: match.username, email: match.email };
    NQ.setToken(mockToken);
    NQ.setUser(mockUser);
    return { ok: true, data: { token: mockToken, user: mockUser } };
  }

  // If user just typed something new or first time demo
  if (users.length === 0) {
    const defaultUser = { id: 1, username: email.split('@')[0], email };
    NQ.setToken('mock-jwt-demo');
    NQ.setUser(defaultUser);
    return { ok: true, data: { token: 'mock-jwt-demo', user: defaultUser } };
  }

  return { ok: false, data: { error: 'Invalid email or password' } };
}

async function apiLogout() {
  try { await apiFetch('/auth/logout', { method: 'POST' }); } catch (e) {}
  NQ.clearToken();
  NQ.clearUser();
}

async function apiGetMe() {
  const local = NQ.getUser();
  if (local) return { ok: true, data: { user: local } };
  return apiFetch('/auth/me');
}

/* ════════════════════════════════════════════════════════════════
   SAVED PLACES
════════════════════════════════════════════════════════════════ */
async function apiGetSaved() {
  try {
    const r = await apiFetch('/places/saved');
    if (r.ok) return r;
  } catch (e) {}
  const local = JSON.parse(localStorage.getItem('nq_saved_places') || '[]');
  return { ok: true, data: local };
}

/**
 * Save a place object (as produced by processPlaces in app.js).
 * Maps app.js field names → server field names automatically.
 */
async function apiSavePlace(place) {
  try {
    const r = await apiFetch('/places/saved', {
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
    if (r.ok) return r;
  } catch (e) {}

  // Fallback to localStorage
  const saved = JSON.parse(localStorage.getItem('nq_saved_places') || '[]');
  if (!saved.find(p => p.id === place.id || p.overpass_id === place.id)) {
    saved.push({ ...place, saved_at: new Date().toISOString() });
    localStorage.setItem('nq_saved_places', JSON.stringify(saved));
  }
  return { ok: true, data: { message: 'Saved locally' } };
}

async function apiUnsavePlace(dbId) {
  try {
    const r = await apiFetch(`/places/saved/${dbId}`, { method: 'DELETE' });
    if (r.ok) return r;
  } catch (e) {}
  const saved = JSON.parse(localStorage.getItem('nq_saved_places') || '[]');
  const filtered = saved.filter(p => p.id !== dbId && p.overpass_id !== dbId);
  localStorage.setItem('nq_saved_places', JSON.stringify(filtered));
  return { ok: true };
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
