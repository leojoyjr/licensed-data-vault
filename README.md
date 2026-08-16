# Licensed Training Data Vault on Shelby

This project stores training data on Shelby with license metadata attached to every file, captures a cryptographic read receipt each time a file is served, logs that receipt on Aptos, and generates an audit report for any training run. The goal is to make it possible to prove that every file used in a training run was lawfully acquired and covered by a valid license at the time it was read.

Shelby is a verifiable object storage protocol that returns proofs of what it served. That property is what makes provenance possible here. Ordinary storage records nothing about rights, so a compliance claim about a dataset cannot be checked after the fact. Attaching license terms per file, and logging each read against those terms, turns compliance into something you can query.

## Status

All eight sprints are complete. The repository is scaffolded, the Shelby CLI is configured against Shelbynet, the signing account is funded with APT and ShelbyUSD, the upload pipeline stores files with validated license metadata recorded in a local manifest, every read goes through one middleware function that enforces the license and captures a verifiable receipt, each served read is logged as an event by a Move module on Shelbynet, the audit command turns those events into a compliance report for any training run, and a Material Design 3 website in `web/` drives all three operations from a browser. `SECURITY.md` records the threat model, the protections at each boundary, and the known limitations.

## Requirements

Node.js v22 or later, npm, and git. The Shelby CLI is installed globally with `npm install -g @shelby-protocol/cli`. The Aptos CLI is needed to compile and publish the Move module, installed with `brew install aptos`.

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

## Reading a file, and what the receipt contains

Reads go through `readLicensedBlob` in `src/read/receiptMiddleware.ts`. It is the only function in the codebase that downloads from Shelby, so there is no way for training code to bypass the license check:

```
npm run read:blob -- --blob-name vault/sprint2-sample.txt --reader trainer-1 --run run-sprint3 --use training
```

The middleware resolves the blob's license from the manifest, refuses the read if the license does not cover the declared use or has expired, and only then downloads. Checking before the network call means an unauthorized read never fetches bytes, so there is nothing to leak. Reads are also refused when the blob has no manifest entry, because an asset with no known license is not an asset the vault will serve.

The installed SDK, version 0.7.1, returns `Promise<ShelbyBlob>` from `client.download({ account, blobName })`, and `ShelbyBlob` is `{ account, name, readable, contentLength }`. There is no receipt, signature, or proof field anywhere in its public types, so the middleware assembles the receipt from what a read verifiably produces:

```
blobName                    the blob that was requested
servedByAccount             the account the RPC served it from, from the SDK response
merkleRoot                  the blob merkle root recomputed from the served bytes
contentSha256               SHA-256 of the served bytes
servedBytes                 contentLength reported by the RPC
servedAt                    when the read completed
merkleRootMatchesManifest   whether the recomputed root equals the root recorded at upload
```

Recomputing the root with the same `generateCommitments` the upload path used is the verification step. It only matches the root recorded at upload if the bytes served are the bytes that were stored, so a mismatch means the content changed and the middleware refuses to return it rather than handing back unverified data. Every receipt field comes from the SDK response or from recomputation over the served bytes, never from caller input, so a caller cannot fabricate what was served.

A successful read also produces a `ReadEvent` of `{ blobHash, licenseId, readerId, trainingRunId, timestamp, receiptPayload }`, which is anchored on Aptos before the content is returned. `readerId` and `trainingRunId` are required, because a read that cannot be attributed to a reader and a run cannot be audited.

Reads against the shared Shelbynet RPC without an API key are rate limited, and the RPC answers `429 Too Many Requests` when the limit is hit. The Shelby CLI fails the same way under the same conditions, so a 429 is a throttle rather than a defect. Wait and retry, or set `SHELBY_API_KEY` in `.env`.

## The on-chain receipt log

`move/sources/receipt_log.move` is the audit chain of record. It emits one `ReadLogged` event per read with `blob_hash`, `license_id`, `reader`, `training_run_id`, and `timestamp_us`. Nothing is stored mutably, because an audit log that can be edited proves nothing, and events are permanent in the transaction history.

Two fields are deliberately not function arguments. `reader` comes from `signer::address_of(account)`, so a caller cannot log a read under someone else's identity, and `timestamp_us` comes from `timestamp::now_microseconds()`, so a caller with a wrong or dishonest clock cannot place a read outside its license window. The entry function also rejects an empty blob hash, license ID, or run ID, since none of those can be audited.

Compile, test, and publish from `move/`, substituting the signing account address:

```
aptos move compile --named-addresses receipt_log=<address>
aptos move test --named-addresses receipt_log=<address>
aptos move publish --profile shelbynet --named-addresses receipt_log=<address>
```

The Aptos CLI needs a profile pointing at Shelbynet. It is created from the key already in `.env`, so no second account is involved:

```
aptos init --profile shelbynet --network custom \
  --rest-url https://api.shelbynet.shelby.xyz/v1 --skip-faucet --private-key <key>
```

Record the published address in `.env` as `RECEIPT_LOG_MODULE_ADDRESS`. The module address is the publisher's address, so it matches `SHELBY_ACCOUNT_ADDRESS` unless the module was published from a different account. `src/audit/chainWriter.ts` submits `log_read` through the Aptos TypeScript SDK, waits for the transaction to commit, and returns its hash. Waiting matters because a submitted transaction can still fail during execution, and an unconfirmed receipt is not a logged receipt.

`readLicensedBlob` calls the writer after the merkle root check and before returning. A chain write failure propagates and the caller gets no content, even though the bytes were already fetched. That is deliberate. The vault's guarantee is that every served read is logged, so a read the audit trail does not contain must not look like a successful read. Verify any read on the explorer:

```
curl -s https://api.shelbynet.shelby.xyz/v1/transactions/by_hash/<txnHash> | jq '.events'
```

## The audit report

Generate the compliance report for a training run:

```
npm run audit:run -- --run run-sprint5
```

It prints each logged read with its license and transaction hash, then a verdict:

```
Audit report for training run run-sprint5
  verdict: COMPLIANT
  reads logged on chain: 1 (1 compliant, 1 distinct blobs)

  OK   vault/sprint2-sample.txt
       read at 2026-08-16T16:08:14.268Z by 0x95a9e017...
       license LIC-SPRINT2-001 (Example Archive Ltd, training, expires 2027-01-01T00:00:00.000Z)
       txn 0xd08edee3cc25f0b70c75f35bd0a5e51480dc5bf6ae8ce80c545371fe35b26704
```

Every run also writes `reports/audit-<runId>-<date>.md`, the Markdown report an auditor is handed. It contains the verdict, a table of reads with their status, license, rights holder, permitted use, reader, and time, a findings section when something is flagged, and a verification section repeating every blob hash and transaction hash with the exact `curl` command that resolves it. The verification section is the point of the format: a report an auditor cannot independently check is a claim rather than evidence.

Use `--out` to choose a different destination, where a `.json` extension writes JSON instead of Markdown, and `--json` prints the JSON to stdout. Generated reports are gitignored because they describe one operator's reads, and `reports/.gitkeep` keeps the directory present on a fresh clone. The command exits non-zero when a run is not compliant, so a CI job or a release gate can block a model whose training data cannot be shown to have been licensed.

The run ID becomes part of the report file name, so it is restricted to letters, digits, dot, dash, and underscore, and an explicit `--out` path is refused if it resolves outside the project directory.

Each read is judged against the license as it stood at the read's chain timestamp, not against the current time. This is the point of the whole design. A license that has since expired does not invalidate a read that happened while it was live, and a report that compared against "now" would both condemn lawful reads and clear reads that happened after expiry. Four verdicts are possible: `compliant`, `expired-at-read` when the read postdates the license expiry, `unlicensed` when the license on chain disagrees with the manifest or its expiry is unreadable, and `unknown-blob` when no manifest entry matches the logged blob hash. A run with no logged reads is reported as not compliant, because an empty audit trail is an absence of evidence rather than evidence of compliance.

Reads are matched to licenses by merkle root rather than by blob name. The hash identifies the exact bytes that were served, whereas a name could later be pointed at different content.

`src/audit/chainQuery.ts` reads the events back. The Shelbynet indexer's GraphQL schema exposes no `events` root field, confirmed by introspecting `query_root`, so the usual indexer event query is unavailable on this network. The fullnode's account transactions endpoint is used instead, since it returns each transaction with its events inline. That scopes the audit to the logging account's own transactions, which is correct for this vault where one operator account writes every receipt. A malformed event is skipped rather than thrown on, because one unparseable transaction in an account's history must not make the entire audit unavailable.

## The demo website

`web/` is a Material Design 3 site over the same functions the CLI uses. Install and run it:

```
cd web
npm install
npm run dev
```

That starts two processes: the API on `http://localhost:8787` and the UI on `http://localhost:5173`. Open the UI. The three destinations map to the three operations, upload a file with its license, read a blob and see the receipt, and audit a training run.

The API in `web/server/index.ts` holds no business logic. Uploads call `uploadLicensedFile`, reads call `readLicensedBlob`, and audits call `generateAuditReport`, so the license rules and receipt handling are the ones already covered by tests rather than a second implementation that could drift from the first. It exists for one reason: the signing key must stay in a Node process. Signing in a browser would ship the key to every visitor, so the browser sends a request and the server does anything that costs money or touches the key.

The read view shows a refusal as a normal result rather than an error, because a refused read is the system working. A license that permits `evaluation` will decline a `training` read, and the reason it gives is the reason the middleware produced. Successful reads link to the receipt transaction on the Aptos explorer, so the on-chain record is one click from the UI claim.

Theme values come from `web/src/theme/m3Tokens.ts`, a single generated stylesheet of M3 tokens. Both the Material components and the layout CSS read those tokens, so there is no second palette to keep in sync, and no raw hex outside that one file. Uploads are capped at 1 MB and the two routes that spend tokens are rate limited, since a demo that drains the funded account stops being a demo. Build the production bundle with `npm run build`, which type checks first and fails the build on any type error.

## Layout

`src/config` holds environment loading. `src/licenses` holds the license metadata type and its validation. `src/upload` holds the upload pipeline. `src/read` holds the read receipt middleware. `src/audit` holds the report generator and the chain queries it needs. `src/shelby` holds the shared Shelby client. `move` holds the Aptos Move module that records receipts. `scripts` holds operational shell scripts. `tests` holds test files. `web` holds the demo site, with `web/server` for the API, `web/src/views` for the three screens, and `web/src/theme` for the design tokens.

## Verifying the setup

```
npm install
npx tsc --noEmit
npm test
(cd web && npm install && npm run build)
shelby account balance
git status --ignored
```

The type checks, tests, and web build should all pass, balances should be nonzero, and `.env` should appear under ignored files rather than tracked files.

## Security

`SECURITY.md` documents the threat model, where the private key is read and why it is read nowhere else, the validation applied at every boundary, the two Move decisions that make the receipt log hard to forge, and the known limitations. The gaps are listed there deliberately: the local API has no authentication, the manifest is unsigned, and one key performs every role. Each is acceptable for a single-operator demo and would need addressing before this ran as a service.

## Sprint workflow

Work happened one sprint at a time against the plan in `Shelby Licensed Training Data Vault - Implementation Plan.md`. Each sprint ended with its definition-of-done checks, a security review, and a single commit, then stopped until the next sprint was approved. Nothing from a later sprint was started early, because each sprint reads the previous sprint's committed code as its starting point.
