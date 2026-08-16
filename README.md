# Licensed Training Data Vault on Shelby

This project stores training data on Shelby with license metadata attached to every file, captures a cryptographic read receipt each time a file is served, logs that receipt on Aptos, and generates an audit report for any training run. The goal is to make it possible to prove that every file used in a training run was lawfully acquired and covered by a valid license at the time it was read.

Shelby is a verifiable object storage protocol that returns proofs of what it served. That property is what makes provenance possible here. Ordinary storage records nothing about rights, so a compliance claim about a dataset cannot be checked after the fact. Attaching license terms per file, and logging each read against those terms, turns compliance into something you can query.

## Status

Sprint 1 is complete. The repository is scaffolded, the Shelby CLI is configured against Shelbynet, and the signing account is funded with APT and ShelbyUSD. There is no feature code yet. Later sprints add the upload pipeline, the read receipt middleware, the Aptos Move receipt log, the audit report generator, and a demo website.

## Requirements

Node.js v22 or later, npm, and git. The Shelby CLI is installed globally with `npm install -g @shelby-protocol/cli`.

## Setup

Install project dependencies:

```
npm install
```

Configure the Shelby CLI. This writes contexts and a fresh account to `~/.shelby/config.yaml` and sets shelbynet as the default context:

```
shelby init --setup-default
```

Copy the environment template and fill in the address and private key that `shelby init` printed:

```
cp .env.example .env
```

`.env` is gitignored and is the only file in this repository that may contain a private key. `.env.example` holds dummy values so the variable names are documented without leaking anything.

## Funding the account

Uploads cost ShelbyUSD and transactions cost APT for gas, so the account needs both. Run:

```
./scripts/fundAccount.sh
```

The script reads the default account address from `~/.shelby/config.yaml`, requests APT and ShelbyUSD from the Shelbynet faucet, then prints the resulting balances. If the faucet service rejects the request, open the web faucet instead with `shelby faucet --network shelbynet --no-open` and use the printed URL.

Check balances at any time:

```
shelby account balance
```

Both APT and ShelbyUSD must be nonzero before any upload will succeed.

## Layout

`src/config` holds environment loading. `src/licenses` holds the license metadata type and its validation. `src/upload` holds the upload pipeline. `src/read` holds the read receipt middleware. `src/audit` holds the report generator and the chain queries it needs. `src/shelby` holds the shared Shelby client. `move` holds the Aptos Move module that records receipts. `scripts` holds operational shell scripts. `web` holds the demo site, added in a later sprint. `tests` holds test files.

## Verifying the setup

```
npm install
npx tsc --noEmit
shelby account balance
git status --ignored
```

The type check should pass, balances should be nonzero, and `.env` should appear under ignored files rather than tracked files.

## Sprint workflow

Work happens one sprint at a time against the plan in `Shelby Licensed Training Data Vault - Implementation Plan.md`. Each sprint ends with its definition-of-done checks, a security review, and a single commit, then stops until the next sprint is approved. Nothing from a later sprint is started early, because each sprint reads the previous sprint's committed code as its starting point.
