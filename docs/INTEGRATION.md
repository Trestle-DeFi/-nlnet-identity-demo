# Integration Guide: NLnet Identity Demo

## Endpoints (worker: https://n-identity.dydise1.workers.dev)

- `GET /health` — service health.
- `POST /identity/verify` — server-side verification. Body: `{ wallet, passportScore, linkedAccounts, telegramInitData? }`. Returns `{ eligible, reasons, thresholds, verifiedAt }`.
- `GET /gigs` — list gigs.
- `POST /gigs` — create gig. Body: `{ title, description? }`.
- `GET /gigs/:id` — gig details + assignment/completion/review.
- `POST /gigs/:id/assign` — assign verified freelancer. Body: `{ wallet }`.
- `POST /gigs/:id/complete` — mark complete (must be assigned).
- `POST /gigs/:id/review` — record review. Body: `{ rating, comment? }` (must be completed).

## Thresholds
- Passport score >= 20
- Linked accounts >= 3
- Telegram initData validated server-side only if `TELEGRAM_BOT_TOKEN` env is set.

## Non-financial demo flow
1. Create gig.
2. Verify freelancer.
3. Assign (only if verified).
4. Complete.
5. Review.

No payments, staking, yield, rewards, settlement, or escrow in this flow.

## Data & privacy
Currently in-memory store (resets on worker restart). D1 binding `DB` (database `n-identity`) is configured for persistence; schema/migrations pending. Privacy claims are only valid after auditing backend, DB schema, logs, and retention.

## Testing
```
cd worker
npm install
npm test
```
EOF