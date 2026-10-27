import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();
app.use("*", cors());
app.use("*", async (c, next) => {
  const kv = c.env && c.env.KV;
  if (!kv) return next();
  const ip = c.req.header("CF-Connecting-IP") || "unknown";
  const key = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
  const current = Number(await kv.get(key)) || 0;
  if (current >= 60) {
    return c.json({ error: "rate_limited" }, 429);
  }
  await kv.put(key, String(current + 1), { expirationTtl: 120 });
  return next();
});

const THRESHOLDS = { passportScore: 20, linkedAccounts: 3 };

const mem = {
  gigs: new Map(),
  freelancers: new Map(),
  assignments: new Map(),
  completions: new Set(),
  reviews: new Map(),
};

async function ensureSchema(db) {
  if (!db) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS freelancers (wallet TEXT PRIMARY KEY, eligible INTEGER NOT NULL, reasons TEXT NOT NULL, verified_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS gigs (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS assignments (gig_id TEXT PRIMARY KEY, wallet TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS completions (gig_id TEXT PRIMARY KEY)"),
    db.prepare("CREATE TABLE IF NOT EXISTS reviews (gig_id TEXT PRIMARY KEY, rating INTEGER NOT NULL, comment TEXT, created_at TEXT NOT NULL)"),
  ]);
}

function db(c) { return c.env && c.env.DB; }

app.get("/health", (c) => c.json({ ok: true, service: "n-identity" }));

app.post("/identity/verify", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { wallet, passportScore, linkedAccounts, telegramInitData } = body;
  if (!wallet || typeof wallet !== "string") {
    return c.json({ eligible: false, reasons: ["missing_wallet"] }, 400);
  }
  const reasons = [];
  const score = Number(passportScore ?? 0);
  const linked = Number(linkedAccounts ?? 0);
  if (score < THRESHOLDS.passportScore) reasons.push("passport_score_too_low");
  if (linked < THRESHOLDS.linkedAccounts) reasons.push("insufficient_linked_accounts");

  const botToken = (c.env && c.env.TELEGRAM_BOT_TOKEN) || null;
  if (telegramInitData) {
    if (!botToken) {
      reasons.push("telegram_not_configured");
    } else {
      try {
        const params = new URLSearchParams(telegramInitData);
        const hash = params.get("hash");
        if (!hash) throw new Error("missing_hash");
        params.delete("hash");
        const dataCheckString = [...params.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join("\n");
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey("raw", enc.encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const secretKey = await crypto.subtle.sign("HMAC", key, enc.encode(botToken));
        const hmacKey = await crypto.subtle.importKey("raw", secretKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const sig = await crypto.subtle.sign("HMAC", hmacKey, enc.encode(dataCheckString));
        const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
        if (hex !== hash) reasons.push("telegram_initdata_invalid");
      } catch {
        reasons.push("telegram_parse_error");
      }
    }
  }

  const eligible = reasons.length === 0;
  const verifiedAt = new Date().toISOString();
  const result = { wallet, eligible, reasons, thresholds: THRESHOLDS, verifiedAt };

  const d = db(c);
  if (d) {
    await ensureSchema(d);
    await d.prepare("INSERT OR REPLACE INTO freelancers (wallet, eligible, reasons, verified_at) VALUES (?,?,?,?)")
      .bind(wallet, eligible ? 1 : 0, JSON.stringify(reasons), verifiedAt).run();
  } else {
    mem.freelancers.set(wallet, result);
  }
  return c.json(result);
});

app.get("/gigs", async (c) => {
  const d = db(c);
  if (d) {
    await ensureSchema(d);
    const { results } = await d.prepare("SELECT * FROM gigs ORDER BY created_at DESC").all();
    const gigs = results.map((g) => ({ id: g.id, title: g.title, description: g.description, status: g.status, createdAt: g.created_at }));
    return c.json({ gigs });
  }
  return c.json({ gigs: [...mem.gigs.values()] });
});

app.post("/gigs", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { title, description } = body;
  if (!title) return c.json({ error: "missing_title" }, 400);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const gig = { id, title, description: description || "", status: "open", createdAt };

  const d = db(c);
  if (d) {
    await ensureSchema(d);
    await d.prepare("INSERT INTO gigs (id, title, description, status, created_at) VALUES (?,?,?,?,?)")
      .bind(id, title, description || "", "open", createdAt).run();
  } else {
    mem.gigs.set(id, gig);
  }
  return c.json(gig, 201);
});

app.get("/gigs/:id", async (c) => {
  const id = c.req.param("id");
  const d = db(c);
  if (d) {
    await ensureSchema(d);
    const gig = await d.prepare("SELECT * FROM gigs WHERE id = ?").bind(id).first();
    if (!gig) return c.json({ error: "not_found" }, 404);
    const assignment = await d.prepare("SELECT wallet FROM assignments WHERE gig_id = ?").bind(id).first();
    const completion = await d.prepare("SELECT 1 FROM completions WHERE gig_id = ?").bind(id).first();
    const review = await d.prepare("SELECT * FROM reviews WHERE gig_id = ?").bind(id).first();
    return c.json({
      id: gig.id, title: gig.title, description: gig.description, status: gig.status, createdAt: gig.created_at,
      assignedTo: assignment ? assignment.wallet : null,
      completed: !!completion,
      review: review ? { gigId: id, rating: review.rating, comment: review.comment, createdAt: review.created_at } : null,
    });
  }
  const gig = mem.gigs.get(id);
  if (!gig) return c.json({ error: "not_found" }, 404);
  return c.json({ ...gig, assignedTo: mem.assignments.get(gig.id) || null, completed: mem.completions.has(gig.id), review: mem.reviews.get(gig.id) || null });
});

app.post("/gigs/:id/assign", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const { wallet } = body;

  const d = db(c);
  if (d) {
    await ensureSchema(d);
    const gig = await d.prepare("SELECT * FROM gigs WHERE id = ?").bind(id).first();
    if (!gig) return c.json({ error: "not_found" }, 404);
    if (gig.status !== "open") return c.json({ error: "gig_not_open" }, 409);
    const verification = await d.prepare("SELECT eligible FROM freelancers WHERE wallet = ?").bind(wallet).first();
    if (!verification || !verification.eligible) return c.json({ error: "freelancer_not_verified" }, 403);
    await d.prepare("INSERT OR REPLACE INTO assignments (gig_id, wallet) VALUES (?,?)").bind(id, wallet).run();
    await d.prepare("UPDATE gigs SET status = 'assigned' WHERE id = ?").bind(id).run();
    return c.json({ assigned: true, gigId: id, wallet });
  }

  const gig = mem.gigs.get(id);
  if (!gig) return c.json({ error: "not_found" }, 404);
  if (gig.status !== "open") return c.json({ error: "gig_not_open" }, 409);
  const verification = mem.freelancers.get(wallet);
  if (!verification || !verification.eligible) return c.json({ error: "freelancer_not_verified" }, 403);
  mem.assignments.set(id, wallet);
  gig.status = "assigned";
  return c.json({ assigned: true, gigId: id, wallet });
});

app.post("/gigs/:id/complete", async (c) => {
  const id = c.req.param("id");
  const d = db(c);
  if (d) {
    await ensureSchema(d);
    const gig = await d.prepare("SELECT status FROM gigs WHERE id = ?").bind(id).first();
    if (!gig) return c.json({ error: "not_found" }, 404);
    if (gig.status !== "assigned") return c.json({ error: "gig_not_assigned" }, 409);
    await d.prepare("INSERT OR REPLACE INTO completions (gig_id) VALUES (?)").bind(id).run();
    await d.prepare("UPDATE gigs SET status = 'completed' WHERE id = ?").bind(id).run();
    return c.json({ completed: true, gigId: id });
  }
  const gig = mem.gigs.get(id);
  if (!gig) return c.json({ error: "not_found" }, 404);
  if (gig.status !== "assigned") return c.json({ error: "gig_not_assigned" }, 409);
  mem.completions.add(id);
  gig.status = "completed";
  return c.json({ completed: true, gigId: id });
});

app.post("/gigs/:id/review", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const { rating, comment } = body;
  if (!rating) return c.json({ error: "missing_rating" }, 400);

  const d = db(c);
  if (d) {
    await ensureSchema(d);
    const completion = await d.prepare("SELECT 1 FROM completions WHERE gig_id = ?").bind(id).first();
    if (!completion) return c.json({ error: "gig_not_completed" }, 409);
    const createdAt = new Date().toISOString();
    await d.prepare("INSERT OR REPLACE INTO reviews (gig_id, rating, comment, created_at) VALUES (?,?,?,?)")
      .bind(id, Number(rating), comment || "", createdAt).run();
    await d.prepare("UPDATE gigs SET status = 'reviewed' WHERE id = ?").bind(id).run();
    return c.json({ gigId: id, rating: Number(rating), comment: comment || "", createdAt }, 201);
  }
  const gig = mem.gigs.get(id);
  if (!gig) return c.json({ error: "not_found" }, 404);
  if (!mem.completions.has(id)) return c.json({ error: "gig_not_completed" }, 409);
  const review = { gigId: id, rating: Number(rating), comment: comment || "", createdAt: new Date().toISOString() };
  mem.reviews.set(id, review);
  gig.status = "reviewed";
  return c.json(review, 201);
});

export default app;
