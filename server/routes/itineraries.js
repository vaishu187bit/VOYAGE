/* ═══════════════════════════════════════════════════════════════
   NearbyQuest – routes/itineraries.js
   GET    /api/itineraries            – list user's itineraries
   POST   /api/itineraries            – save a new itinerary (with stops)
   GET    /api/itineraries/:id        – get one itinerary with stops
   DELETE /api/itineraries/:id        – delete an itinerary
═══════════════════════════════════════════════════════════════ */
'use strict';

const express      = require('express');
const db           = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

// GET /api/itineraries
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM itineraries WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ itineraries: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/itineraries
// body: { title, city_name, center_lat, center_lon, radius_m, stops: [...] }
router.post('/', requireAuth, async (req, res) => {
  const { title, city_name, center_lat, center_lon, radius_m = 10000, stops = [] } = req.body;
  if (!title || !city_name || center_lat == null || center_lon == null)
    return res.status(400).json({ error: 'title, city_name, center_lat, center_lon required' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [itin] = await conn.query(
      `INSERT INTO itineraries (user_id, title, city_name, center_lat, center_lon, radius_m, place_count)
       VALUES (?,?,?,?,?,?,?)`,
      [req.user.id, title, city_name, center_lat, center_lon, radius_m, stops.length]
    );
    const itinId = itin.insertId;

    // Bulk-insert stops
    if (stops.length) {
      const stopValues = stops.map((s, i) => [
        itinId, s.overpass_id || s.id, s.name, s.category, s.categoryId || s.category_id,
        s.lat, s.lon, s.distLabel || null, s.entryFee?.label || null,
        s.bestTime || null, s.address || null, i, s.dayIndex || 0,
      ]);
      await conn.query(
        `INSERT INTO itinerary_stops
           (itinerary_id, overpass_id, name, category, category_id, latitude, longitude,
            dist_label, entry_fee, best_time, address, stop_order, day_index)
         VALUES ?`,
        [stopValues]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Itinerary saved', id: itinId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// GET /api/itineraries/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [itin] = await db.query(
      'SELECT * FROM itineraries WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!itin.length)
      return res.status(404).json({ error: 'Not found' });

    const [stops] = await db.query(
      'SELECT * FROM itinerary_stops WHERE itinerary_id = ? ORDER BY day_index, stop_order',
      [req.params.id]
    );
    res.json({ itinerary: { ...itin[0], stops } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/itineraries/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM itineraries WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Itinerary deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
