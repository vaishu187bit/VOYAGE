/* ═══════════════════════════════════════════════════════════════
   NearbyQuest – routes/auth.js
   POST /api/auth/register  – create account
   POST /api/auth/login     – login and receive session token
   POST /api/auth/logout    – invalidate session
   GET  /api/auth/me        – get current user
═══════════════════════════════════════════════════════════════ */
'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const db       = require('../db');

const router = express.Router();

// ── Helper: generate a secure session token ──────────────────
function genToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ── Middleware: authenticate session token ───────────────────
async function requireAuth(req, res, next) {
  const token = req.headers['x-session-token'];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const [rows] = await db.query(
    'SELECT s.*, u.id AS uid, u.username, u.email, u.avatar_url FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > NOW()',
    [token]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid or expired session' });

  req.user = { id: rows[0].uid, username: rows[0].username, email: rows[0].email, avatar_url: rows[0].avatar_url };
  next();
}

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'username, email and password are required' });

  try {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username.trim(), email.trim().toLowerCase(), hash]
    );
    res.status(201).json({ message: 'Account created', userId: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Email already registered' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'email and password are required' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!rows.length)
      return res.status(401).json({ error: 'Invalid email or password' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid email or password' });

    // Create session (30-day expiry)
    const token = genToken();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.query(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      [token, user.id, expires]
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  const token = req.headers['x-session-token'];
  await db.query('DELETE FROM sessions WHERE id = ?', [token]);
  res.json({ message: 'Logged out' });
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = { router, requireAuth };
