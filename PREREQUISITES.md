# What is needed from you before the remaining sprints

Sprints 1 through 3 are done and needed nothing from you beyond the Shelbynet
account that `shelby init` created and the faucet funds already in it. Nothing is
missing retroactively. This file records what the remaining sprints need, so the
items that involve a browser login or a human decision can be collected in one
pass instead of blocking mid sprint.

## Required

### Aptos CLI, for Sprint 4

The Move module is compiled, tested, and published with the Aptos CLI, and it is
not installed on this machine. It is free, no account or key needed, and it is
the only hard blocker for Sprint 4:

```
brew install aptos
aptos --version
```

The CLI will need an `~/.aptos` profile pointing at Shelbynet. That profile is
created from the private key already in `.env`, so no new key is generated and
nothing new needs to be funded. Publishing costs APT for gas, and the account
holds 2.97 APT, which is far more than a module publish needs.

### More faucet funds, once, before Sprint 6

The account currently holds 2.97 APT and 0.29 ShelbyUSD. APT is fine for the
rest of the project. ShelbyUSD is the storage fee token, and the demo site in
Sprint 6 uploads through the browser, so the balance will be spent faster than
the CLI has been spending it. The faucet request has to go through a browser
page, so it is a task only you can do:

```
shelby faucet --network shelbynet
```

Do this when Sprint 6 starts rather than now, since the faucet has per-window
limits and topping up early wastes the allowance.

## Optional, and worth having

### `SHELBY_API_KEY`

The shared Shelbynet RPC rate limits unauthenticated traffic and answers `429
Too Many Requests` when the limit is hit. Sprint 3 already hit this during
testing. The SDK accepts an API key, `src/config/env.ts` already reads
`SHELBY_API_KEY` as an optional variable, and `src/shelby/client.ts` already
passes it to the RPC and indexer, so adding one is a matter of pasting a value
into `.env` with no code change:

```
SHELBY_API_KEY=<key>
```

Shelby does not hand these out through a self service dashboard yet. The route
is to ask in the Shelby Discord, https://discord.gg/shelbyserves, for a Shelbynet
RPC key for a project doing repeated reads. Everything works without it. The
symptom of not having it is intermittent 429 responses during the Sprint 6 demo,
which is survivable for a demo but looks like a bug to anyone watching.

## Explicitly not needed

No paid API keys, cloud accounts, or third party services are required by any
sprint. Specifically:

Aptos does not require an API key for Shelbynet reads or writes, so Sprint 4 and
Sprint 5 talk to the fullnode and indexer endpoints already in `.env` without
credentials. Sprint 5 queries the same endpoints. Sprint 6 uses React, Vite, and
the Material Web Components, all installed from npm with no account. Sprint 7 and
Sprint 8 are review and cleanup, run entirely locally.

No new private key is needed at any point. The single account in `.env` signs
uploads, reads, the module publish, and every receipt log.

## Decisions settled

The Move module publishes from the existing account in `.env`, confirmed, so the
receipt log lives at that account's address permanently and no second account is
created.

Sprint 6 builds the demo site and serves it locally, reachable at localhost on
this machine. That is the default and needs nothing extra.

## Summary

Install the Aptos CLI before Sprint 4. Request faucet funds again when Sprint 6
starts. Ask Discord for a `SHELBY_API_KEY` at any point, since it only reduces
rate limiting and is not required. Nothing else is needed from your end.
