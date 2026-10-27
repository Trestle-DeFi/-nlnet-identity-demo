import { Hono } from "hono";

const app = new Hono();

// Trusted server boundary for identity proof validation only.
// No payments, staking, yield, rewards, or settlement.

app.get("/health", (c) => c.json({ ok: true, service: "nlnet-identity-demo" }));

// Placeholder: gig lifecycle (non-financial)
app.get("/gigs", (c) => c.json({ gigs: [] }));
app.post("/gigs", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({ created: true, gig: body }, 201);
});

// Placeholder: identity verification result (server-validated in real impl)
app.post("/identity/verify", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  return c.json({ eligible: false, reason: "not_implemented", input: body });
});

// Placeholder: assignment based on verifiable result
app.post("/gigs/:id/assign", (c) => c.json({ assigned: false, reason: "not_implemented" }));

// Placeholder: completion + review
app.post("/gigs/:id/complete", (c) => c.json({ completed: false, reason: "not_implemented" }));
app.post("/gigs/:id/review", (c) => c.json({ reviewed: false, reason: "not_implemented" }));

export default app;
