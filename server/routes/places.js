/* ═══════════════════════════════════════════════════════════════
   NearbyQuest – routes/places.js
   GET    /api/places/saved          – list user's saved places
   POST   /api/places/saved          – save a place
   DELETE /api/places/saved/:id      – unsave a place
   GET    /api/places/history        – recent searches
   POST   /api/places/history        – record a search
   GET    /api/places/cache          – check API response cache
   POST   /api/places/cache          – store API response cache
═══════════════════════════════════════════════════════════════ */
'use strict';

const express      = require('express');
const crypto       = require('crypto');
const db           = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();
const CACHE_TTL_H = parseInt(process.env.CACHE_TTL_HOURS || '6', 10);

// ── Helper: cache key from coordinates ───────────────────────
function cacheKey(lat, lon, radius) {
  return crypto.createHash('sha1').update(`${lat}|${lon}|${radius}`).digest('hex');
}

// ════════════════════════════════════════════════════════════
//  SAVED PLACES
// ════════════════════════════════════════════════════════════

// GET /api/places/saved
router.get('/saved', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM saved_places WHERE user_id = ? ORDER BY saved_at DESC',
      [req.user.id]
    );
    res.json({ places: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/places/saved  – body: place object from app.js
router.post('/saved', requireAuth, async (req, res) => {
  const p = req.body;
  const required = ['overpass_id', 'name', 'category', 'category_id', 'latitude', 'longitude'];
  if (required.some(k => p[k] == null))
    return res.status(400).json({ error: `Missing fields: ${required.join(', ')}` });

  try {
    const [result] = await db.query(
      `INSERT IGNORE INTO saved_places
         (user_id, overpass_id, name, category, category_id, latitude, longitude,
          dist_label, entry_fee, best_time, address, maps_url, directions_url, wiki_url)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.user.id, p.overpass_id, p.name, p.category, p.category_id,
        p.latitude, p.longitude, p.dist_label || null,
        p.entry_fee || null, p.best_time || null, p.address || null,
        p.maps_url || null, p.directions_url || null, p.wiki_url || null,
      ]
    );
    if (result.affectedRows === 0)
      return res.status(409).json({ message: 'Place already saved' });
    res.status(201).json({ message: 'Place saved', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/places/saved/:id
router.delete('/saved/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM saved_places WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Removed from saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════
//  SEARCH HISTORY
// ════════════════════════════════════════════════════════════

// GET /api/places/history?limit=10
router.get('/history', requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
  try {
    const [rows] = await db.query(
      'SELECT * FROM search_history WHERE user_id = ? ORDER BY searched_at DESC LIMIT ?',
      [req.user.id, limit]
    );
    res.json({ history: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/places/history  – body: { query, latitude, longitude }
router.post('/history', requireAuth, async (req, res) => {
  const { query, latitude, longitude } = req.body;
  if (!query || latitude == null || longitude == null)
    return res.status(400).json({ error: 'query, latitude, longitude required' });

  try {
    await db.query(
      'INSERT INTO search_history (user_id, query, latitude, longitude) VALUES (?,?,?,?)',
      [req.user.id, query, latitude, longitude]
    );
    // Keep only last 20 per user
    await db.query(
      `DELETE FROM search_history WHERE user_id = ? AND id NOT IN (
         SELECT id FROM (SELECT id FROM search_history WHERE user_id = ? ORDER BY searched_at DESC LIMIT 20) t
       )`,
      [req.user.id, req.user.id]
    );
    res.status(201).json({ message: 'History recorded' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════
//  API RESPONSE CACHE (public – no auth needed)
// ════════════════════════════════════════════════════════════

// GET /api/places/cache?lat=&lon=&radius=
router.get('/cache', async (req, res) => {
  const { lat, lon, radius = 10000 } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });

  const key = cacheKey(parseFloat(lat).toFixed(4), parseFloat(lon).toFixed(4), radius);
  try {
    const [rows] = await db.query(
      'SELECT payload, cached_at, expires_at FROM place_cache WHERE cache_key = ? AND expires_at > NOW()',
      [key]
    );
    if (!rows.length) return res.status(404).json({ hit: false });

    // Bump hit counter
    db.query('UPDATE place_cache SET hit_count = hit_count + 1 WHERE cache_key = ?', [key]);
    res.json({ hit: true, places: JSON.parse(rows[0].payload), cached_at: rows[0].cached_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/places/cache  – body: { lat, lon, radius, places[] }
router.post('/cache', async (req, res) => {
  const { lat, lon, radius = 10000, places } = req.body;
  if (!lat || !lon || !Array.isArray(places))
    return res.status(400).json({ error: 'lat, lon, places[] required' });

  const key = cacheKey(parseFloat(lat).toFixed(4), parseFloat(lon).toFixed(4), radius);
  const expires = new Date(Date.now() + CACHE_TTL_H * 60 * 60 * 1000);
  try {
    await db.query(
      `INSERT INTO place_cache (cache_key, center_lat, center_lon, radius_m, payload, expires_at)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), cached_at = NOW(), expires_at = VALUES(expires_at), hit_count = 1`,
      [key, lat, lon, radius, JSON.stringify(places), expires]
    );
    res.status(201).json({ message: 'Cached' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
