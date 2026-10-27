import { describe, it, expect } from "vitest";
import app from "../src/index.ts";

describe("n-identity worker", () => {
  it("health", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("verify eligible freelancer", async () => {
    const res = await app.request("/identity/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: "0xabc", passportScore: 25, linkedAccounts: 4 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.eligible).toBe(true);
  });

  it("gig lifecycle", async () => {
    const create = await app.request("/gigs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test gig" }),
    });
    const gig = await create.json();
    expect(gig.status).toBe("open");

    await app.request("/identity/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: "0xabc", passportScore: 25, linkedAccounts: 4 }),
    });

    const assign = await app.request(`/gigs/${gig.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: "0xabc" }),
    });
    expect(assign.status).toBe(200);

    const complete = await app.request(`/gigs/${gig.id}/complete`, { method: "POST" });
    expect(complete.status).toBe(200);

    const review = await app.request(`/gigs/${gig.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 5, comment: "great" }),
    });
    expect(review.status).toBe(201);
  });
});
