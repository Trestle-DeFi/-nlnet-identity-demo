import { Hono } from "hono";

const app = new Hono();

const store = {
  gigs: new Map(),
  freelancers: new Map(),
  assignments: new Map(),
  completions: new Set(),
  reviews: new Map(),
};

const THRESHOLDS = { passportScore: 20, linkedAccounts: 3 };

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
  const result = { wallet, eligible, reasons, thresholds: THRESHOLDS, verifiedAt: new Date().toISOString() };
  store.freelancers.set(wallet, result);
  return c.json(result);
});

app.get("/gigs", (c) => c.json({ gigs: [...store.gigs.values()] }));

app.post("/gigs", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { title, description } = body;
  if (!title) return c.json({ error: "missing_title" }, 400);
  const id = crypto.randomUUID();
  const gig = { id, title, description: description || "", status: "open", createdAt: new Date().toISOString() };
  store.gigs.set(id, gig);
  return c.json(gig, 201);
});

app.get("/gigs/:id", (c) => {
  const gig = store.gigs.get(c.req.param("id"));
  if (!gig) return c.json({ error: "not_found" }, 404);
  return c.json({ ...gig, assignedTo: store.assignments.get(gig.id) || null, completed: store.completions.has(gig.id), review: store.reviews.get(gig.id) || null });
});

app.post("/gigs/:id/assign", async (c) => {
  const id = c.req.param("id");
  const gig = store.gigs.get(id);
  if (!gig) return c.json({ error: "not_found" }, 404);
  if (gig.status !== "open") return c.json({ error: "gig_not_open" }, 409);
  const body = await c.req.json().catch(() => ({}));
  const { wallet } = body;
  const verification = store.freelancers.get(wallet);
  if (!verification || !verification.eligible) return c.json({ error: "freelancer_not_verified" }, 403);
  store.assignments.set(id, wallet);
  gig.status = "assigned";
  return c.json({ assigned: true, gigId: id, wallet });
});

app.post("/gigs/:id/complete", async (c) => {
  const id = c.req.param("id");
  const gig = store.gigs.get(id);
  if (!gig) return c.json({ error: "not_found" }, 404);
  if (gig.status !== "assigned") return c.json({ error: "gig_not_assigned" }, 409);
  store.completions.add(id);
  gig.status = "completed";
  return c.json({ completed: true, gigId: id });
});

app.post("/gigs/:id/review", async (c) => {
  const id = c.req.param("id");
  const gig = store.gigs.get(id);
  if (!gig) return c.json({ error: "not_found" }, 404);
  if (!store.completions.has(id)) return c.json({ error: "gig_not_completed" }, 409);
  const body = await c.req.json().catch(() => ({}));
  const { rating, comment } = body;
  if (!rating) return c.json({ error: "missing_rating" }, 400);
  const review = { gigId: id, rating: Number(rating), comment: comment || "", createdAt: new Date().toISOString() };
  store.reviews.set(id, review);
  gig.status = "reviewed";
  return c.json(review, 201);
});

export default app;
