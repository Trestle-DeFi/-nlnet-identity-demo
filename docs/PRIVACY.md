# Privacy & Data Flow

## What is collected
- Wallet address (freelancer identity key)
- Gitcoin Passport score + linked account count (verification inputs)
- Telegram initData (optional, only if TELEGRAM_BOT_TOKEN configured; validated server-side)
- Gig metadata (title, description)
- Review (rating, comment)

## Storage
- Currently in-memory (resets on worker restart). D1 binding `DB` (database `n-identity`) is configured; schema in `worker/schema.sql`.
- No third-party storage of PII beyond verification providers (Gitcoin Passport, Telegram).

## Retention & deletion
- In-memory: cleared on restart.
- D1: retained until deleted; deletion endpoints TBD.

## Claims
- Do not claim "no PII storage" until backend + DB + logs are audited.
- Sybil resistance is probabilistic and context-specific.
EOF