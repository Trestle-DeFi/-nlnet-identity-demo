-- D1 schema for n-identity demo (run via wrangler d1 execute)
CREATE TABLE IF NOT EXISTS freelancers (
  wallet TEXT PRIMARY KEY,
  eligible INTEGER NOT NULL,
  reasons TEXT NOT NULL,
  verified_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gigs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assignments (
  gig_id TEXT PRIMARY KEY,
  wallet TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS completions (
  gig_id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS reviews (
  gig_id TEXT PRIMARY KEY,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL
);
