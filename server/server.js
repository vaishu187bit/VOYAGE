/* ═══════════════════════════════════════════════════════════════
   NearbyQuest – server.js
   Express REST API server that connects the frontend to MySQL.
═══════════════════════════════════════════════════════════════ */
'use strict';

require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const path        = require('path');

const { router: authRouter } = require('./routes/auth');
const placesRouter            = require('./routes/places');
const itinerariesRouter       = require('./routes/itineraries');

const app  = express();
const PORT = parseInt(process.env.PORT || process.env.SERVER_PORT || '3001', 10);

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*' }));          // tighten in production
app.use(express.json({ limit: '2mb' })); // for place payload cache

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',        authRouter);
app.use('/api/places',      placesRouter);
app.use('/api/itineraries', itinerariesRouter);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Serve frontend (optional) ─────────────────────────────────
// If you want a single port, the Express server can also serve the
// static frontend files. Remove the comment to enable.
// app.use(express.static(path.join(__dirname, '..')));

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Voyage API server running on http://localhost:${PORT}`);
  console.log(`   Health → http://localhost:${PORT}/api/health`);
});
