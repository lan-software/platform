#!/usr/bin/env bash
# Bring the Lan-Software demo stack up. Generates secrets on first run.
set -euo pipefail

cd "$(dirname "$0")/.."

log() { printf '[up %(%F %T)T] %s\n' -1 "$*"; }

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

if [[ ! -f "${ENV_FILE}" ]]; then
    log "No .env found — copying from ${ENV_EXAMPLE}"
    cp "${ENV_EXAMPLE}" "${ENV_FILE}"
    log "Edit .env to set DEMO_* hostnames and CADDY_LE_EMAIL, then re-run."
    exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

required_hosts=(DEMO_DOMAIN DEMO_LANCORE_HOST DEMO_LANBRACKETS_HOST DEMO_LANENTRANCE_HOST DEMO_LANHELP_HOST DEMO_LANSHOUT_HOST DEMO_MAILPIT_HOST CADDY_LE_EMAIL)
for var in "${required_hosts[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        log "ERROR: ${var} is empty in .env"
        exit 1
    fi
done

# Write a key back to .env if empty.
set_env_var() {
    local key="$1" val="$2"
    if grep -q "^${key}=" "${ENV_FILE}"; then
        # Use a sentinel-based replace without sed-escaping headaches.
        python3 - "$key" "$val" "${ENV_FILE}" <<'PY'
import sys
k, v, p = sys.argv[1], sys.argv[2], sys.argv[3]
lines = open(p).read().splitlines()
out = []
for line in lines:
    if line.startswith(f"{k}="):
        out.append(f"{k}={v}")
    else:
        out.append(line)
open(p, "w").write("\n".join(out) + "\n")
PY
    else
        printf '%s=%s\n' "${key}" "${val}" >> "${ENV_FILE}"
    fi
}

ensure_app_key() {
    local key="$1"
    if [[ -z "${!key:-}" ]]; then
        local val="base64:$(openssl rand -base64 32)"
        log "Generating ${key}"
        set_env_var "${key}" "${val}"
        export "${key}=${val}"
    fi
}

ensure_app_key LANCORE_APP_KEY
ensure_app_key LANBRACKETS_APP_KEY
ensure_app_key LANENTRANCE_APP_KEY
ensure_app_key LANHELP_APP_KEY
ensure_app_key LANSHOUT_APP_KEY

if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
    val="$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-32)"
    log "Generating POSTGRES_PASSWORD"
    set_env_var POSTGRES_PASSWORD "${val}"
    export POSTGRES_PASSWORD="${val}"
fi

# Render postgres init SQL from template (only consumed on first volume init).
log "Rendering seed/postgres-init.sql"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" envsubst < seed/postgres-init.sql.tmpl > seed/postgres-init.sql

log "Pulling images..."
docker compose pull

log "Starting stack..."
docker compose up -d

log "Waiting for lancore healthcheck..."
for _ in $(seq 1 60); do
    status="$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q lancore)" 2>/dev/null || echo starting)"
    if [[ "${status}" == "healthy" ]]; then
        log "lancore healthy"
        break
    fi
    sleep 5
done

if [[ "${status:-}" != "healthy" ]]; then
    log "ERROR: lancore did not become healthy in time"
    exit 1
fi

log "Seeding..."
./seed/seed.sh

log "Up complete."
