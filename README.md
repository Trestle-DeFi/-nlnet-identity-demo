# NLnet Identity Demo

Standalone, non-financial gig-work demonstration of a reusable identity / Sybil-resistance kit.

**Positioning (per `NLNET-FIT-RECOMMENDATION.md` and `NLNET-BUILDING-PLAN.md`):**
Trestle TMA is existing groundwork / a possible pilot client. This repo is the **external-style demo** that proves the identity capability can be integrated independently of TMA's Telegram Mini App, DeFi features, token economy, staking, and settlement.

## Demo flow (no payments)
1. A platform creates or lists a gig.
2. A freelancer completes the proposed verification flow.
3. The platform accepts/assigns the freelancer based on a verifiable result.
4. The freelancer completes the task.
5. The platform records completion and a review — no token rewards, no staking.

## Architecture
- `worker/` — Hono on Cloudflare Workers. Trusted server boundary for proof validation (identity endpoints only; no payments/staking/yield).
- `frontend/` — Minimal web client (not a Telegram Mini App) calling the worker's identity API.

## Worker reuse decision
A **standalone minimal worker** is preferred over reusing TMA's worker, because the NLnet acceptance criteria require evidence that an external client can integrate the capability. Reusing TMA's worker couples the demo to TMA infra and undermines the "independent integration" proof. TMA's worker may be used as a *reference* for proof-validation logic, but this demo validates proofs on its own trusted boundary.

## Out of scope here
Payments, staking, yield, token rewards, withdrawals, settlement, smart-contract escrow, Telegram-specific behavior, multi-chain marketplace.

## Status
Scaffold only. Phase 0 audit of TMA identity paths must complete before any security/privacy claim is made.
