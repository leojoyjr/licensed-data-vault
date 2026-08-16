#!/usr/bin/env bash
# Funds the default Shelby CLI account on shelbynet with APT for gas and
# ShelbyUSD for upload fees. Re-run this whenever balances run low.
#
# The Shelby CLI faucet command only prints a browser URL, so this script calls
# the same faucet service directly to keep re-funding to a single command.
set -euo pipefail

FAUCET_URL="https://faucet.shelbynet.shelby.xyz/fund"
APT_OCTAS="${APT_OCTAS:-100000000}"
SHELBY_CONFIG="${SHELBY_CONFIG:-$HOME/.shelby/config.yaml}"

if ! command -v shelby >/dev/null 2>&1; then
  echo "shelby CLI not found. Install it with: npm install -g @shelby-protocol/cli" >&2
  exit 1
fi

# Read the address from the CLI config rather than .env so the funded account is
# always the one the CLI will sign with. The config is parsed instead of
# 'shelby account list' because that table wraps long addresses across lines.
# Only the address line is matched, since the private key line also contains a
# 64 character hex string and must never be treated as an address.
ADDRESS="$(grep -m1 -E '^[[:space:]]*address:' "$SHELBY_CONFIG" 2>/dev/null | grep -oE '0x[0-9a-f]{64}' || true)"
if [ -z "$ADDRESS" ]; then
  echo "Could not read an account address from $SHELBY_CONFIG." >&2
  echo "Run 'shelby init --setup-default' first." >&2
  exit 1
fi

echo "Funding $ADDRESS on shelbynet"

echo "Requesting APT for gas"
curl -sS -f -X POST "$FAUCET_URL" \
  -H 'Content-Type: application/json' \
  -d "{\"address\":\"$ADDRESS\",\"amount\":$APT_OCTAS}"
echo

echo "Requesting ShelbyUSD for upload fees"
curl -sS -f -X POST "$FAUCET_URL?asset=shelbyusd" \
  -H 'Content-Type: application/json' \
  -d "{\"address\":\"$ADDRESS\"}"
echo

echo "Current balances:"
shelby account balance

echo
echo "If either faucet call fails, open the web faucet instead:"
echo "  shelby faucet --network shelbynet --no-open"
