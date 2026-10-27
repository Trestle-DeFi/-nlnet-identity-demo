# NLnet Identity Demo

Standalone, non-financial gig-work demonstration of a reusable identity / Sybil-resistance kit for open gig-work platforms.

NLnet positioning: Trestle TMA is existing groundwork / a possible pilot client. This repo is the external-style demo proving the identity capability can be integrated independently of TMA's Telegram Mini App, DeFi features, token economy, staking, and settlement. It does not claim TMA is already an SDK.

## Demo flow (no payments)
1. A platform creates or lists a gig.
2. A freelancer completes the proposed verification flow.
3. The platform accepts/assigns the freelancer based on a verifiable result.
4. The freelancer completes the task.
5. The platform records completion and a review - no token rewards, no staking.

## Architecture
- worker/ - Hono on Cloudflare Workers. Trusted server boundary. D1 persistence, KV rate limiting.
- frontend/ - Web client (not a Telegram Mini App).
- docs/ - Privacy and data-flow documentation.
- examples/ - Runnable example client.

## Out of scope
Payments, staking, yield, token rewards, withdrawals, settlement, smart-contract escrow, Telegram-specific behavior, multi-chain marketplace.

## Status
Complete demo: D1 persistence, KV rate limiting, CORS, styled frontend, tests, example client, privacy doc, CI/CD.

Basis: NLNET-FIT-RECOMMENDATION.md and NLNET-BUILDING-PLAN.md. Not a full security audit.
