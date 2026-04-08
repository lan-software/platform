#!/usr/bin/env bash
# Full reset cycle: skip if idle, otherwise teardown, rotate secrets, bring up, seed.
set -euo pipefail

cd "$(dirname "$0")/.."

log() { printf '[reset %(%F %T)T] %s\n' -1 "$*"; }

start_ts="$(date +%s)"

log "Checking idle..."
if ! ./scripts/check-idle.sh; then
    log "Skipping reset (idle)."
    exit 0
fi

log "Tearing stack down..."
docker compose down -v --remove-orphans

# Rotate POSTGRES_PASSWORD + all app keys.
ENV_FILE=".env"

rotate() {
    local key="$1" val="$2"
    python3 - "$key" "$val" "${ENV_FILE}" <<'PY'
import sys
k, v, p = sys.argv[1], sys.argv[2], sys.argv[3]
lines = open(p).read().splitlines()
seen = False
out = []
for line in lines:
    if line.startswith(f"{k}="):
        out.append(f"{k}={v}")
        seen = True
    else:
        out.append(line)
if not seen:
    out.append(f"{k}={v}")
open(p, "w").write("\n".join(out) + "\n")
PY
}

log "Rotating secrets..."
rotate POSTGRES_PASSWORD "$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-32)"
for k in LANCORE_APP_KEY LANBRACKETS_APP_KEY LANENTRANCE_APP_KEY LANHELP_APP_KEY LANSHOUT_APP_KEY; do
    rotate "${k}" "base64:$(openssl rand -base64 32)"
done

log "Bringing stack back up..."
./scripts/up.sh

elapsed=$(( $(date +%s) - start_ts ))
log "Reset complete in ${elapsed}s"
