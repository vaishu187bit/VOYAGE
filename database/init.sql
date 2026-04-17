-- ═══════════════════════════════════════════════════════════════
--  NearbyQuest – MySQL Database Schema
--  Run once to create the database and all required tables.
-- ═══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS nearbyquest
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nearbyquest;

-- ── 1. USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  username      VARCHAR(60)     NOT NULL,
  email         VARCHAR(120)    NOT NULL UNIQUE,
  password_hash VARCHAR(255)    NOT NULL,
  avatar_url    VARCHAR(500)    DEFAULT NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- ── 2. USER SESSIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id         CHAR(64)        NOT NULL,
  user_id    INT UNSIGNED    NOT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP       NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ── 3. SAVED PLACES ─────────────────────────────────────────────
-- Individual locations bookmarked by users
CREATE TABLE IF NOT EXISTS saved_places (
  id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED    NOT NULL,
  overpass_id  BIGINT          NOT NULL,          -- OSM element id
  name         VARCHAR(300)    NOT NULL,
  category     VARCHAR(60)     NOT NULL,
  category_id  VARCHAR(40)     NOT NULL,
  latitude     DECIMAL(10, 7)  NOT NULL,
  longitude    DECIMAL(10, 7)  NOT NULL,
  dist_label   VARCHAR(20)     DEFAULT NULL,
  entry_fee    VARCHAR(120)    DEFAULT NULL,
  best_time    VARCHAR(120)    DEFAULT NULL,
  address      VARCHAR(400)    DEFAULT NULL,
  maps_url     VARCHAR(600)    DEFAULT NULL,
  directions_url VARCHAR(600)  DEFAULT NULL,
  wiki_url     VARCHAR(600)    DEFAULT NULL,
  saved_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_place (user_id, overpass_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_saved (user_id),
  INDEX idx_category (category_id)
) ENGINE=InnoDB;

-- ── 4. ITINERARIES ──────────────────────────────────────────────
-- A named trip / day-plan saved by a user
CREATE TABLE IF NOT EXISTS itineraries (
  id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED    NOT NULL,
  title        VARCHAR(200)    NOT NULL,
  city_name    VARCHAR(200)    NOT NULL,
  center_lat   DECIMAL(10, 7)  NOT NULL,
  center_lon   DECIMAL(10, 7)  NOT NULL,
  radius_m     INT             NOT NULL DEFAULT 10000,
  place_count  INT             NOT NULL DEFAULT 0,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_itin (user_id)
) ENGINE=InnoDB;

-- ── 5. ITINERARY STOPS ──────────────────────────────────────────
-- Individual stops linked to an itinerary (ordered list)
CREATE TABLE IF NOT EXISTS itinerary_stops (
  id             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  itinerary_id   INT UNSIGNED    NOT NULL,
  overpass_id    BIGINT          NOT NULL,
  name           VARCHAR(300)    NOT NULL,
  category       VARCHAR(60)     NOT NULL,
  category_id    VARCHAR(40)     NOT NULL,
  latitude       DECIMAL(10, 7)  NOT NULL,
  longitude      DECIMAL(10, 7)  NOT NULL,
  dist_label     VARCHAR(20)     DEFAULT NULL,
  entry_fee      VARCHAR(120)    DEFAULT NULL,
  best_time      VARCHAR(120)    DEFAULT NULL,
  address        VARCHAR(400)    DEFAULT NULL,
  stop_order     SMALLINT        NOT NULL DEFAULT 0,
  day_index      TINYINT         NOT NULL DEFAULT 0,  -- which "day" of itinerary (0-indexed)
  PRIMARY KEY (id),
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
  INDEX idx_itin (itinerary_id)
) ENGINE=InnoDB;

-- ── 6. SEARCH HISTORY ───────────────────────────────────────────
-- Last N searches per user for quick-replay
CREATE TABLE IF NOT EXISTS search_history (
  id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED    NOT NULL,
  query      VARCHAR(300)    NOT NULL,
  latitude   DECIMAL(10, 7)  NOT NULL,
  longitude  DECIMAL(10, 7)  NOT NULL,
  searched_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_history (user_id, searched_at)
) ENGINE=InnoDB;

-- ── 7. PLACE API CACHE ──────────────────────────────────────────
-- Cache Overpass API responses to reduce latency and API rate-limits
CREATE TABLE IF NOT EXISTS place_cache (
  cache_key    VARCHAR(64)     NOT NULL,            -- SHA1 of (lat,lon,radius)
  center_lat   DECIMAL(10, 7)  NOT NULL,
  center_lon   DECIMAL(10, 7)  NOT NULL,
  radius_m     INT             NOT NULL,
  payload      MEDIUMTEXT      NOT NULL,            -- JSON array of processed places
  hit_count    INT             NOT NULL DEFAULT 1,
  cached_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at   TIMESTAMP       NOT NULL,
  PRIMARY KEY (cache_key),
  INDEX idx_expiry (expires_at)
) ENGINE=InnoDB;

-- ════════════════════════════════════════════════════════════════
--  Sample seed data (optional – comment out in production)
-- ════════════════════════════════════════════════════════════════
INSERT IGNORE INTO users (username, email, password_hash) VALUES
  ('demo_user', 'demo@nearbyquest.app', '$2b$12$placeholderHashReplaceMeBeforeProduction');
