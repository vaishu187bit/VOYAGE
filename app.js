/* ═══════════════════════════════════════════════
   NearbyQuest – app.js
   Manual city search · Overpass API · Leaflet Map
═══════════════════════════════════════════════ */

const RADIUS_M = 10000; // 10 km

const CATEGORY_CONFIG = [
  { id: 'all',           label: 'All',             emoji: '🌐', color: '#6c63ff' },
  { id: 'tourism',       label: 'Attractions',      emoji: '🏛️', color: '#6c63ff' },
  { id: 'historic',      label: 'Historic',         emoji: '🏰', color: '#ff6b9d' },
  { id: 'natural',       label: 'Nature',           emoji: '🌿', color: '#00d4aa' },
  { id: 'leisure',       label: 'Parks & Leisure',  emoji: '🌳', color: '#4ecdc4' },
  { id: 'food',          label: 'Food & Drink',     emoji: '🍽️', color: '#ffd166' },
  { id: 'shopping',      label: 'Shopping',         emoji: '🛍️', color: '#ff6b9d' },
  { id: 'religious',     label: 'Religious',        emoji: '🕌', color: '#a78bfa' },
  { id: 'accommodation', label: 'Hotels',           emoji: '🏨', color: '#f97316' },
];

const PLACE_ICONS = {
  tourism:         { icon: '🏛️', color: '#6c63ff' },
  historic:        { icon: '🏰', color: '#ff6b9d' },
  natural:         { icon: '🌿', color: '#00d4aa' },
  leisure:         { icon: '🌳', color: '#4ecdc4' },
  amenity_food:    { icon: '🍽️', color: '#ffd166' },
  amenity_worship: { icon: '🕌', color: '#a78bfa' },
  shop:            { icon: '🛍️', color: '#ff6b9d' },
  hotel:           { icon: '🏨', color: '#f97316' },
  default:         { icon: '📍', color: '#8892a4' },
};

// ── State ──────────────────────────────────────
let userLat = null, userLon = null;
let allPlaces = [], filteredPlaces = [];
let mapInstance = null;
let activeCategory = 'all';
let markers = [];
let suggestTimer = null;

// ══════════════════════════════════════════════
// SEARCH BOX UI
// ══════════════════════════════════════════════

function onSearchInput(val) {
  const clearBtn = document.getElementById('clear-btn');
  clearBtn.classList.toggle('hidden', val.length === 0);

  clearTimeout(suggestTimer);
  if (val.trim().length < 2) { dismissSuggestions(); return; }

  suggestTimer = setTimeout(() => fetchSuggestions(val.trim()), 350);
}

async function fetchSuggestions(q) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    renderSuggestions(data);
  } catch { dismissSuggestions(); }
}

function renderSuggestions(items) {
  const list = document.getElementById('suggestions');
  list.innerHTML = '';
  if (!items.length) { list.classList.add('hidden'); return; }

  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'suggestion-item';
    const label = item.display_name.split(',').slice(0, 3).join(', ');
    li.innerHTML = `<span class="sug-icon">📍</span><span>${esc(label)}</span>`;
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      document.getElementById('city-input').value = label;
      document.getElementById('clear-btn').classList.remove('hidden');
      dismissSuggestions();
      runSearch(parseFloat(item.lat), parseFloat(item.lon), label);
    });
    list.appendChild(li);
  });

  list.classList.remove('hidden');
}

function dismissSuggestions() {
  document.getElementById('suggestions').classList.add('hidden');
}

function clearSearch() {
  document.getElementById('city-input').value = '';
  document.getElementById('clear-btn').classList.add('hidden');
  dismissSuggestions();
  document.getElementById('city-input').focus();
}

function scrollToSearch() {
  document.getElementById('hero').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => document.getElementById('city-input').focus(), 600);
}

// ══════════════════════════════════════════════
// AUTO GEOLOCATION
// ══════════════════════════════════════════════

function detectLocation() {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser. Please enter a city manually.');
    return;
  }

  const btn = document.getElementById('locate-btn');
  btn.disabled = true;
  btn.classList.add('locating');
  btn.innerHTML = `<span class="locate-pulse"></span><span class="locate-spinner"></span><span class="locate-label">Detecting your location…</span>`;

  showLoader('Requesting location access…', 10);

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      setLoaderProgress(35, 'Location found! Identifying area…');

      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();

        // Pick the best human-readable name from the address
        const addr = data.address || {};
        const name =
          addr.city       ||
          addr.town       ||
          addr.village    ||
          addr.suburb     ||
          addr.county     ||
          addr.state      ||
          data.display_name?.split(',')[0] ||
          'Your Location';

        document.getElementById('city-input').value = name;
        document.getElementById('clear-btn').classList.remove('hidden');
        resetLocateBtn();
        runSearch(lat, lon, name);

      } catch {
        resetLocateBtn();
        hideLoader();
        showError('Location found but could not identify the area name. Please enter it manually.');
      }
    },

    (err) => {
      resetLocateBtn();
      hideLoader();

      switch (err.code) {
        case 1: // PERMISSION_DENIED
          showLocationPermissionModal();
          break;
        case 2: // POSITION_UNAVAILABLE
          showError('Your location is currently unavailable. Please check your device settings or enter a city manually.');
          break;
        case 3: // TIMEOUT
          showError('Location detection timed out. Please try again or enter a city manually.');
          break;
        default:
          showError('Could not detect location. Please enter a city manually.');
      }
    },

    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000,
    }
  );
}

function resetLocateBtn() {
  const btn = document.getElementById('locate-btn');
  btn.disabled = false;
  btn.classList.remove('locating');
  btn.innerHTML = `<span class="locate-pulse"></span><span class="locate-icon">📍</span><span class="locate-label">Detect My Location</span>`;
}

function showLocationPermissionModal() {
  document.getElementById('location-permission-modal').classList.remove('hidden');
}

function closePermissionModal() {
  document.getElementById('location-permission-modal').classList.add('hidden');
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePermissionModal();
    document.getElementById('auth-modal')?.classList.add('hidden');
    document.getElementById('place-detail-modal')?.classList.add('hidden');
  }
});

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrapper')) dismissSuggestions();
});

// ══════════════════════════════════════════════
// AUTH MODAL HANDLERS
// ══════════════════════════════════════════════

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('login-form').classList.toggle('hidden', !isLogin);
  document.getElementById('register-form').classList.toggle('hidden', isLogin);
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
}

async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.classList.add('hidden');
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Signing in…';

  const r = await apiLogin(email, password);
  btn.disabled = false; btn.textContent = 'Sign In →';
  if (r.ok) {
    document.getElementById('auth-modal').classList.add('hidden');
    nqInitAuthUI();
    showToast('✅ Signed in successfully!');
  } else {
    errEl.textContent = r.data.error || 'Login failed';
    errEl.classList.remove('hidden');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('register-error');
  errEl.classList.add('hidden');
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Creating account…';

  const r = await apiRegister(username, email, password);
  btn.disabled = false; btn.textContent = 'Create Account →';
  if (r.ok) {
    await apiLogin(email, password);
    document.getElementById('auth-modal').classList.add('hidden');
    nqInitAuthUI();
    showToast('🎉 Account created! You are now signed in.');
  } else {
    errEl.textContent = r.data.error || 'Registration failed';
    errEl.classList.remove('hidden');
  }
}

// Save a place from the card (requires login)
async function handleSavePlace(btn, place) {
  if (!NQ.getToken()) {
    document.getElementById('auth-modal').classList.remove('hidden');
    showToast('🔒 Please sign in to save places.');
    return;
  }
  btn.disabled = true;
  const r = await apiSavePlace(place);
  if (r.ok) {
    btn.textContent = '✅ Saved';
    btn.style.color = '#00d4aa';
    showToast(`🔖 "${place.name}" saved!`);
  } else {
    btn.disabled = false;
    showToast(r.data.message || r.data.error || 'Could not save place.');
  }
}

// Toast notification
function showToast(msg, duration = 3000) {
  let t = document.getElementById('nq-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'nq-toast';
    t.className = 'nq-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), duration);
}

// Initialise auth bar on load
window.addEventListener('DOMContentLoaded', () => nqInitAuthUI());

// ══════════════════════════════════════════════
// SEARCH & GEOCODE
// ══════════════════════════════════════════════

function quickSearch(city) {
  document.getElementById('city-input').value = city;
  document.getElementById('clear-btn').classList.remove('hidden');
  dismissSuggestions();
  searchLocation();
}

async function searchLocation() {
  const query = document.getElementById('city-input').value.trim();
  if (!query) {
    showError('Please enter a city or area name first.');
    document.getElementById('city-input').focus();
    return;
  }

  dismissSuggestions();
  showLoader(`Looking up "${query}"…`, 15);

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();

    if (!data || data.length === 0) {
      hideLoader();
      showError(`Could not find "${query}". Try a more specific city or area name.`);
      return;
    }

    const place = data[0];
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    const name = place.display_name.split(',').slice(0, 2).join(', ');

    runSearch(lat, lon, name);
  } catch {
    hideLoader();
    showError('Network error. Please check your internet connection.');
  }
}

function runSearch(lat, lon, displayName) {
  userLat = lat;
  userLon = lon;
  document.getElementById('location-name').textContent = displayName;
  setLoaderProgress(30, 'Fetching nearby places…');
  // Record search in DB silently (only if user is logged in)
  if (typeof apiRecordSearch === 'function') apiRecordSearch(displayName, lat, lon);
  fetchPlaces(lat, lon);
}

// ══════════════════════════════════════════════
// OVERPASS API – FETCH PLACES
// ══════════════════════════════════════════════

function buildQuery(lat, lon) {
  return `
  [out:json][timeout:20];
  (
    nwr["tourism"~"attraction|museum|monument|viewpoint|artwork|gallery|theme_park|zoo|aquarium|hotel|hostel|motel|guest_house"](around:${RADIUS_M},${lat},${lon});
    nwr["historic"](around:${RADIUS_M},${lat},${lon});
    nwr["natural"~"peak|beach|waterfall|hot_spring|rock|cave_entrance|spring"](around:${RADIUS_M},${lat},${lon});
    nwr["leisure"~"park|garden|nature_reserve|stadium|sports_centre"](around:${RADIUS_M},${lat},${lon});
    nwr["amenity"~"restaurant|cafe|bar|pub|fast_food|food_court|ice_cream|place_of_worship"](around:${RADIUS_M},${lat},${lon});
    nwr["shop"~"mall|supermarket|market|department_store|clothes|electronics|books"](around:${RADIUS_M},${lat},${lon});
  );
  out 200 center tags;
  `;
}

async function timedFetch(url, opts, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(t);
    return r;
  } catch (e) { clearTimeout(t); throw e; }
}

async function fetchPlaces(lat, lon) {
  const body = 'data=' + encodeURIComponent(buildQuery(lat, lon));
  const MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];

  let data = null;
  for (let i = 0; i < MIRRORS.length; i++) {
    try {
      setLoaderProgress(40 + i * 15, `Fetching places… (server ${i + 1}/${MIRRORS.length})`);
      const res = await timedFetch(MIRRORS[i], { method: 'POST', body }, 15000);
      if (!res.ok) continue;
      const json = await res.json();
      if (json && json.elements) { data = json; break; }
    } catch { /* try next */ }
  }

  if (!data) {
    hideLoader();
    showError('Could not reach the map data server. Please check your internet and try again.');
    return;
  }

  setLoaderProgress(90, 'Processing results…');
  processPlaces(data.elements, lat, lon);
}

// ══════════════════════════════════════════════
// PROCESS PLACES
// ══════════════════════════════════════════════

function processPlaces(elements, uLat, uLon) {
  const seen = new Set();
  const places = [];

  for (const el of elements) {
    const tags = el.tags || {};
    const name = tags.name || tags['name:en'];
    if (!name) continue;

    const key = name.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!lat || !lon) continue;

    const dist = haversine(uLat, uLon, lat, lon);
    if (dist > RADIUS_M) continue;

    const cat = classify(tags);
    const icon = getIcon(tags);

    places.push({
      id: el.id, name, lat, lon, dist,
      distLabel: formatDist(dist),
      category: cat.label,
      categoryId: cat.id,
      icon: icon.icon,
      color: icon.color,
      address: buildAddress(tags),
      tags: buildTags(tags),
      fares: getCabFares(dist),
      entryFee: getEntryFee(tags, cat.id),
      bestTime: getBestTime(cat.id),
      wikiUrl: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(name)}`,
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
      olaUrl: `https://book.olacabs.com/?pickup_lat=${uLat}&pickup_lng=${uLon}&drop_lat=${lat}&drop_lng=${lon}&utm_source=voyage`,
      uberUrl: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${uLat}&pickup[longitude]=${uLon}&pickup[nickname]=My+Location&dropoff[latitude]=${lat}&dropoff[longitude]=${lon}&dropoff[nickname]=${encodeURIComponent(name)}`,
    });
  }

  places.sort((a, b) => a.dist - b.dist);
  allPlaces = places.slice(0, 100);
  filteredPlaces = [...allPlaces];

  setLoaderProgress(100, 'Done!');
  hideLoader();

  // Store in backend cache (fire-and-forget, won't block UI)
  apiStoreCache(uLat, uLon, allPlaces);

  document.getElementById('place-count').textContent = allPlaces.length;
  renderChips();
  renderItinerary(filteredPlaces);
  renderMap(allPlaces);
  showSections();
}

// ── Classify & Icon ────────────────────────────
function classify(tags) {
  if (['hotel','hostel','motel','guest_house'].includes(tags.tourism))
    return { id: 'accommodation', label: 'Hotel / Accommodation' };
  if (tags.tourism) return { id: 'tourism', label: cap(tags.tourism) };
  if (tags.historic) return { id: 'historic', label: cap(tags.historic) };
  if (tags.natural)  return { id: 'natural',  label: cap(tags.natural) };
  if (tags.leisure)  return { id: 'leisure',  label: cap(tags.leisure) };
  if (tags.amenity === 'place_of_worship') return { id: 'religious', label: 'Place of Worship' };
  if (tags.amenity)  return { id: 'food',     label: cap(tags.amenity) };
  if (tags.shop)     return { id: 'shopping', label: cap(tags.shop) };
  return { id: 'other', label: 'Point of Interest' };
}

function getIcon(tags) {
  if (['hotel','hostel','motel'].includes(tags.tourism)) return PLACE_ICONS.hotel;
  if (tags.tourism) return PLACE_ICONS.tourism;
  if (tags.historic) return PLACE_ICONS.historic;
  if (tags.natural)  return PLACE_ICONS.natural;
  if (tags.leisure)  return PLACE_ICONS.leisure;
  if (tags.amenity === 'place_of_worship') return PLACE_ICONS.amenity_worship;
  if (tags.amenity)  return PLACE_ICONS.amenity_food;
  if (tags.shop)     return PLACE_ICONS.shop;
  return PLACE_ICONS.default;
}

function buildAddress(tags) {
  const p = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city']].filter(Boolean);
  return p.length ? p.join(', ') : null;
}

function buildTags(tags) {
  const out = [];
  for (const k of ['cuisine','opening_hours','wheelchair','fee']) {
    if (tags[k]) { out.push(`${k.replace(/_/g,' ')}: ${tags[k]}`); if (out.length >= 3) break; }
  }
  return out;
}

// ══════════════════════════════════════════════
// PRICING & INFO HELPERS
// ══════════════════════════════════════════════

function getCabFares(distM) {
  const km = Math.max(0.5, distM / 1000);
  const BASE = 30;
  return {
    auto: Math.max(40,  Math.round(BASE * 0.7 + km * 11)),
    ola:  Math.max(60,  Math.round(BASE       + km * 14)),
    cab:  Math.max(100, Math.round(BASE * 1.2 + km * 20)),
  };
}

function getEntryFee(tags, catId) {
  if (tags.fee === 'no' || tags.fee === 'No')  return { label: 'Free Entry',           free: true  };
  if (tags.charge)                              return { label: tags.charge,             free: false };
  if (tags['fee:amount'])                       return { label: `₹${tags['fee:amount']}`,free: false };
  if (tags.fee === 'yes')                       return { label: 'Paid Entry',            free: false };

  const defaults = {
    tourism:       { label: '₹50 – ₹500',            free: false },
    historic:      { label: '₹20 – ₹300',            free: false },
    natural:       { label: 'Free – ₹100',           free: false },
    leisure:       { label: '₹20 – ₹100',            free: false },
    food:          { label: '₹150 – ₹800 / person',  free: false },
    shopping:      { label: 'Free Entry',             free: true  },
    religious:     { label: 'Free Entry',             free: true  },
    accommodation: { label: '₹1,500 – ₹8,000 / night',free: false },
    other:         { label: 'Varies',                 free: false },
  };
  return defaults[catId] || { label: 'Varies', free: false };
}

function getBestTime(catId) {
  const times = {
    tourism:       'Morning (9 AM – 12 PM)',
    historic:      'Morning (8 AM – 11 AM)',
    natural:       'Early Morning or Sunset',
    leisure:       'Evening (4 PM – 7 PM)',
    food:          'Lunch (12–3 PM) or Dinner (7–10 PM)',
    shopping:      'Afternoon (11 AM – 6 PM)',
    religious:     'Early Morning (6–9 AM)',
    accommodation: 'Check-in: 2 PM onwards',
    other:         'Anytime',
  };
  return times[catId] || 'Anytime';
}

// ══════════════════════════════════════════════
// CATEGORY CHIPS
// ══════════════════════════════════════════════

function renderChips() {
  const container = document.getElementById('category-chips');
  container.innerHTML = '';
  const counts = { all: allPlaces.length };
  for (const p of allPlaces) counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;

  for (const cat of CATEGORY_CONFIG) {
    const count = counts[cat.id] || 0;
    if (cat.id !== 'all' && count === 0) continue;
    const chip = document.createElement('button');
    chip.className = 'chip' + (cat.id === activeCategory ? ' active' : '');
    chip.id = `chip-${cat.id}`;
    chip.innerHTML = `${cat.emoji} ${cat.label} <span class="chip-count">${count}</span>`;
    chip.addEventListener('click', () => filterBy(cat.id));
    container.appendChild(chip);
  }
}

function filterBy(catId) {
  activeCategory = catId;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.getElementById(`chip-${catId}`)?.classList.add('active');
  filteredPlaces = catId === 'all' ? [...allPlaces] : allPlaces.filter(p => p.categoryId === catId);
  renderItinerary(filteredPlaces);
  updateMapMarkers(filteredPlaces);
}

// ══════════════════════════════════════════════
// ITINERARY
// ══════════════════════════════════════════════

function renderItinerary(places) {
  const grid = document.getElementById('itinerary-grid');
  grid.innerHTML = '';

  if (!places.length) {
    grid.innerHTML = `<div class="no-results"><div class="no-results-icon">🔍</div><p>No places in this category. Try another filter!</p></div>`;
    return;
  }

  const DAY_LABELS = ['Day 1 – Top Picks', 'Day 2 – Explore More', 'Day 3 – Hidden Gems', 'Day 4 – Local Favourites'];
  const COLORS = ['day-0', 'day-1', 'day-2', 'day-3'];
  const CHUNK = Math.max(1, Math.ceil(places.length / Math.min(4, Math.ceil(places.length / 15))));
  const chunks = [];
  for (let i = 0; i < places.length; i += CHUNK) chunks.push(places.slice(i, i + CHUNK));

  chunks.forEach((chunk, idx) => {
    const label = places.length <= 12
      ? (idx === 0 ? 'Recommended Stops' : `More Stops – Part ${idx + 1}`)
      : (DAY_LABELS[idx] || `Part ${idx + 1}`);

    const group = document.createElement('div');
    group.className = 'day-group';
    group.innerHTML = `
      <div class="day-header">
        <span class="day-pill ${COLORS[idx] || 'day-0'}">📅 ${label}</span>
        <div class="day-line"></div>
        <span class="day-count">${chunk.length} places</span>
      </div>
      <div class="day-cards" id="dc-${idx}"></div>`;
    grid.appendChild(group);

    const dc = group.querySelector(`#dc-${idx}`);
    chunk.forEach((place, i) => dc.appendChild(makeCard(place, i * 15)));
  });
}

function makeCard(place, delay) {
  const card = document.createElement('div');
  card.className = 'place-card';
  card.style.animationDelay = `${delay}ms`;

  const tagsHtml = place.tags.map(t => `<span class="card-tag">${esc(t)}</span>`).join('');
  const f = place.fares;
  const fee = place.entryFee;

  card.innerHTML = `
    <div class="card-accent-bar"></div>
    <div class="card-body">
      <div class="card-top">
        <div class="card-icon">${place.icon}</div>
        <div class="card-meta">
          <div class="card-category">${esc(place.category)}</div>
          <div class="card-name">${esc(place.name)}</div>
        </div>
        <span class="card-distance">${esc(place.distLabel)}</span>
      </div>
      ${place.address ? `<div class="card-address"><span class="card-address-icon">📌</span><span>${esc(place.address)}</span></div>` : ''}
      <div class="card-info-row">
        <span class="info-badge ${fee.free ? 'fee-free' : 'fee-paid'}">💰 ${esc(fee.label)}</span>
        <span class="info-badge time-badge">⏰ ${esc(place.bestTime)}</span>
      </div>
      <div class="card-transport">
        <div class="transport-header">🚗 Tap a fare to book instantly</div>
        <div class="transport-grid transport-grid-4">
          <a href="${place.olaUrl}" target="_blank" rel="noopener" class="t-item t-link t-ola" title="Book Auto on Ola">
            <span class="t-icon">🛺</span>
            <span class="t-mode">Auto · Ola</span>
            <span class="t-price">₹${f.auto} – ₹${f.auto + 20}</span>
            <span class="t-book">Book →</span>
          </a>
          <a href="${place.olaUrl}" target="_blank" rel="noopener" class="t-item t-link t-ola" title="Book Cab on Ola">
            <span class="t-icon">🟢</span>
            <span class="t-mode">Ola</span>
            <span class="t-price">₹${f.ola} – ₹${f.ola + 30}</span>
            <span class="t-book">Book →</span>
          </a>
          <a href="${place.uberUrl}" target="_blank" rel="noopener" class="t-item t-link t-uber" title="Book on Uber">
            <span class="t-icon">⚫</span>
            <span class="t-mode">Uber</span>
            <span class="t-price">₹${f.ola} – ₹${f.ola + 30}</span>
            <span class="t-book">Book →</span>
          </a>
          <a href="${place.uberUrl}" target="_blank" rel="noopener" class="t-item t-link t-uber" title="Book Premium Cab on Uber">
            <span class="t-icon">🚖</span>
            <span class="t-mode">Uber XL</span>
            <span class="t-price">₹${f.cab} – ₹${f.cab + 50}</span>
            <span class="t-book">Book →</span>
          </a>
        </div>
        <p class="transport-note">📏 ${esc(place.distLabel)} · tap any tile to open the app · fares are estimates</p>
      </div>
      ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}
    </div>
    <div class="card-actions">
      <a href="${place.directionsUrl}" target="_blank" rel="noopener" class="card-action-btn directions">🧭 Directions</a>
      <a href="${place.mapsUrl}" target="_blank" rel="noopener" class="card-action-btn maps">🗺️ Maps</a>
      <a href="${place.wikiUrl}" target="_blank" rel="noopener" class="card-action-btn wiki">📖 Article</a>
      <button class="card-action-btn save-btn" id="save-${place.id}" onclick="handleSavePlace(this, ${JSON.stringify({id:place.id,name:place.name,category:place.category,categoryId:place.categoryId,lat:place.lat,lon:place.lon,distLabel:place.distLabel,entryFee:place.entryFee,bestTime:place.bestTime,address:place.address,mapsUrl:place.mapsUrl,directionsUrl:place.directionsUrl,wikiUrl:place.wikiUrl}).replace(/"/g,'&quot;')})">🔖 Save</button>
    </div>`;

  card.querySelector('.card-body').addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    openPlaceModal(place);
    // Optional: still fly to map in background
    setTimeout(() => mapInstance?.flyTo([place.lat, place.lon], 16, { animate: true, duration: 1 }), 400);
  });

  return card;
}

// ══════════════════════════════════════════════
// PLACE DETAIL MODAL (Netflix Style)
// ══════════════════════════════════════════════

async function openPlaceModal(place) {
  // Fill pre-known info immediately
  document.getElementById('detail-modal-title').textContent = place.name;
  document.getElementById('detail-modal-category').textContent = place.category;
  document.getElementById('detail-modal-distance').textContent = `📏 ${place.distLabel}`;
  document.getElementById('detail-modal-fee').textContent = `💰 ${place.entryFee.label}`;
  document.getElementById('detail-modal-time').textContent = `⏰ ${place.bestTime}`;
  document.getElementById('detail-modal-address').textContent = place.address ? `📌 ${place.address}` : '';
  
  const tagsHtml = place.tags.map(t => `<span>${esc(t)}</span>`).join('');
  document.getElementById('detail-modal-tags').innerHTML = tagsHtml;
  
  document.getElementById('detail-modal-maps').href = place.mapsUrl;
  document.getElementById('detail-modal-wiki').href = place.wikiUrl;
  
  // Set save button context
  const saveBtn = document.getElementById('detail-modal-save');
  saveBtn.onclick = () => handleSavePlace(saveBtn, place);
  saveBtn.textContent = '🔖 Save Place';
  saveBtn.disabled = false;
  saveBtn.style.color = '';

  // Show modal with loading state
  document.getElementById('detail-modal-summary').textContent = 'Loading Wikipedia summary...';
  document.getElementById('detail-modal-header').style.backgroundImage = 'none';
  document.getElementById('place-detail-modal').classList.remove('hidden');

  // Fetch rich info from Wikipedia API
  try {
    // Wikipedia API prefers spaces as underscores for titles
    const safeTitle = encodeURIComponent(place.name.replace(/ /g, '_'));
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${safeTitle}`;
    const res = await fetch(wikiUrl);
    
    if (!res.ok) throw new Error('Not found');
    const data = await res.json();
    
    if (data.extract) {
      document.getElementById('detail-modal-summary').textContent = data.extract;
    } else {
      document.getElementById('detail-modal-summary').textContent = 'No detailed summary available for this place.';
    }
    
    if (data.thumbnail && data.thumbnail.source) {
      // Use the high-res original image if possible, fallback to thumbnail edge 
      let imgUrl = data.thumbnail.source;
      if (data.originalimage && data.originalimage.source) {
        imgUrl = data.originalimage.source;
      }
      document.getElementById('detail-modal-header').style.backgroundImage = `url('${imgUrl}')`;
    } else {
      document.getElementById('detail-modal-header').style.backgroundImage = 'radial-gradient(circle at bottom right, rgba(108,99,255,0.4) 0%, rgba(8,12,20,1) 80%)';
    }
  } catch (err) {
    document.getElementById('detail-modal-summary').textContent = 'Could not load Wikipedia details for this place. It might not have a dedicated article.';
    document.getElementById('detail-modal-header').style.backgroundImage = 'radial-gradient(circle at bottom right, rgba(108,99,255,0.4) 0%, rgba(8,12,20,1) 80%)';
  }
}

function closePlaceModal() {
  document.getElementById('place-detail-modal').classList.add('hidden');
}

// ══════════════════════════════════════════════
// MAP
// ══════════════════════════════════════════════

function renderMap(places) {
  if (mapInstance) { mapInstance.remove(); mapInstance = null; }

  mapInstance = L.map('map', { center: [userLat, userLon], zoom: 13 });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abcd', maxZoom: 19,
  }).addTo(mapInstance);

  const centerIcon = L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#6c63ff,#00d4aa);border:3px solid white;box-shadow:0 0 16px rgba(108,99,255,0.9)"></div>`,
    iconSize: [22, 22], iconAnchor: [11, 11],
  });
  L.marker([userLat, userLon], { icon: centerIcon })
    .addTo(mapInstance)
    .bindPopup(`<strong>📍 ${esc(document.getElementById('location-name').textContent)}</strong>`)
    .openPopup();

  L.circle([userLat, userLon], {
    radius: RADIUS_M, color: '#6c63ff', fillColor: '#6c63ff',
    fillOpacity: 0.05, weight: 1, dashArray: '6 4',
  }).addTo(mapInstance);

  markers = [];
  addMarkers(places);
}

function addMarkers(places) {
  markers.forEach(m => m.remove());
  markers = [];

  places.forEach(place => {
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:32px;height:32px;border-radius:50%;background:${place.color}22;border:2px solid ${place.color};display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:pointer">${place.icon}</div>`,
      iconSize: [32, 32], iconAnchor: [16, 16],
    });

    const popup = L.popup({ maxWidth: 260 }).setContent(`
      <div style="padding:6px 0">
        <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;color:#00d4aa;margin-bottom:4px">${esc(place.category)}</div>
        <div style="font-size:1rem;font-weight:700;margin-bottom:6px">${esc(place.name)}</div>
        <div style="font-size:0.8rem;color:#ffd166;font-weight:600;margin-bottom:4px">💰 ${esc(place.entryFee.label)}</div>
        <div style="font-size:0.8rem;color:#8892a4;margin-bottom:10px">📏 ${esc(place.distLabel)} away</div>
        <a href="${place.directionsUrl}" target="_blank" style="font-size:0.8rem;color:#00d4aa;font-weight:600">🧭 Get Directions →</a>
      </div>`);

    markers.push(L.marker([place.lat, place.lon], { icon }).bindPopup(popup).addTo(mapInstance));
  });
}

function updateMapMarkers(places) { if (mapInstance) addMarkers(places); }

// ══════════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════════

function showSections() {
  ['location-strip','categories-section','itinerary-section','map-section'].forEach(id => {
    document.getElementById(id).classList.remove('hidden');
  });
  document.getElementById('location-strip').scrollIntoView({ behavior: 'smooth' });
}

function showLoader(text, pct) {
  document.getElementById('loading-overlay').classList.remove('hidden');
  document.getElementById('loader-text').textContent = text;
  setLoaderProgress(pct);
}

function setLoaderProgress(pct, text) {
  document.getElementById('loader-bar').style.width = pct + '%';
  if (text) document.getElementById('loader-text').textContent = text;
}

function hideLoader() { document.getElementById('loading-overlay').classList.add('hidden'); }

function showError(msg) {
  document.getElementById('error-msg').textContent = msg;
  document.getElementById('error-banner').classList.remove('hidden');
}

function dismissError() { document.getElementById('error-banner').classList.add('hidden'); }

// ── Math Helpers ───────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000, dL = toRad(lat2-lat1), dl = toRad(lon2-lon1);
  const a = Math.sin(dL/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dl/2)**2;
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function toRad(d) { return d * Math.PI / 180; }
function formatDist(m) { return m < 1000 ? `${Math.round(m)} m` : `${(m/1000).toFixed(1)} km`; }
function cap(s) { return s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()); }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
