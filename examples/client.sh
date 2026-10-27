#!/usr/bin/env bash
API=https://n-identity.dydise1.workers.dev
# 1. Create gig
curl -s -X POST $API/gigs -H 'Content-Type: application/json' -d '{"title":"Demo gig"}'
# 2. Verify freelancer
curl -s -X POST $API/identity/verify -H 'Content-Type: application/json' -d '{"wallet":"0xabc","passportScore":25,"linkedAccounts":4}'
