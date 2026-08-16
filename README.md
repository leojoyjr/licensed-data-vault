# Licensed Training Data Vault on Shelby

This project stores training data on Shelby with license metadata attached to every file, captures a cryptographic read receipt each time a file is served, logs that receipt on Aptos, and generates an audit report for any training run. The goal is to make it possible to prove that every file used in a training run was lawfully acquired and covered by a valid license at the time it was read.

Shelby is a verifiable object storage protocol that returns proofs of what it served. That property is what makes provenance possible here. Ordinary storage records nothing about rights, so a compliance claim about a dataset cannot be checked after the fact. Attaching license terms per file, and logging each read against those terms, turns compliance into something you can query.

## Status

Sprints 1 and 2 are complete. The repository is scaffolded, the Shelby CLI is configured against Shelbynet, the signing account is funded with APT and ShelbyUSD, and the upload pipeline stores files on Shelby with validated license metadata recorded in a local manifest. Later sprints add the read receipt middleware, the Aptos Move receipt log, the audit report generator, and a demo website.

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

Both APT and ShelbyUSD must be nonzero before any upload will succeed. An upload that fails with `INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE` means the APT balance ran out, and `E_INSUFFICIENT_FUNDS` means ShelbyUSD did. Rerun the fund script in either case.

## Uploading licensed files

Every file goes up with a license attached. License metadata lives in a JSON file next to the data so the exact approved rights text stays under version control:

```json
{
  "licenseId": "LIC-SPRINT2-001",
  "rightsHolder": "Example Archive Ltd",
  "permittedUse": "training",
  "expiresAt": "2027-01-01T00:00:00.000Z",
  "source": "Signed data license agreement, sprint 2 verification asset"
}
```

`permittedUse` is one of `training`, `inference`, or `evaluation`. `expiresAt` must be a full ISO 8601 timestamp in the future. Upload a single file:

```
npm run upload:file -- --file samples/sprint2-sample.txt --license samples/sprint2-sample.license.json --blob-name vault/sprint2-sample.txt --days 7
```

Upload a whole directory, passing a JSON object that maps each file name to its license:

```
npm run upload:dataset -- --dir samples --licenses samples/licenses.json --prefix vault/ --days 7
```

`--days` sets how long Shelby stores the blob, which is separate from how long the license permits use. A dataset upload validates every license before the first network call and aborts the entire batch if any file is unlicensed, expired, or names a file that is not present. A partially uploaded dataset is worse than none, because a training run against it looks complete while missing assets.

## The manifest

Each successful upload appends to `data/manifest.json`, which is the local join table between Shelby blobs and their licenses:

```json
{
  "blobName": "vault/sprint2-sample.txt",
  "merkleRoot": "0x329a2fec6d645d1a85e9a47a5f2e8e94fb3fc7bfec207f2aa868ddb7e4580947",
  "license": { "licenseId": "LIC-SPRINT2-001", "permittedUse": "training", "...": "..." },
  "uploadedAt": "2026-08-16T15:24:00.589Z",
  "blobExpiresAt": "2026-08-23T15:24:00.589Z",
  "sizeBytes": 99
}
```

Shelby stores bytes and commitments, not rights information, so the mapping from blob to license has to live somewhere the read path can consult before serving anything. The manifest is gitignored because it describes one operator's uploads, and it is written by writing a temporary file and renaming it over the target, so a crash cannot leave half-written JSON. The `merkleRoot` is the blob merkle root Shelby computes from the file's commitments, and it matches what `shelby commitment <file> <out.json>` reports for the same bytes.

Confirm an upload landed:

```
shelby account blobs
```

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
