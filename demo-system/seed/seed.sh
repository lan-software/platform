#!/usr/bin/env bash
# Seed the demo stack. Idempotent — safe to run repeatedly.
set -euo pipefail

cd "$(dirname "$0")/.."

log() { printf '[seed %(%F %T)T] %s\n' -1 "$*"; }

log "Seeding LanCore demo data..."
if docker compose exec -T lancore php artisan db:seed --class=SeedDemoCommand --force; then
    log "LanCore seed OK"
else
    log "LanCore seed FAILED"
    exit 1
fi

# Satellite-specific seeders (stub — uncomment per app if/when they exist):
# for svc in lanbrackets lanentrance lanhelp lanshout; do
#     log "Seeding ${svc}..."
#     docker compose exec -T "${svc}" php artisan db:seed --class=SeedDemoCommand --force || log "${svc} seed skipped/failed"
# done

log "Seed complete."
