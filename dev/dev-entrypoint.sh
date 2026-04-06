#!/usr/bin/env bash
#
# Shared dev entrypoint for Lan-Software Sail containers.
# Runs npm install + npm run build before starting the normal Sail container,
# so the Vite manifest is always available without a manual npm run dev.
#
# Mounted into each app's compose.yaml and used as the container entrypoint.
#

set -e

cd /var/www/html

# Install node dependencies if missing
if [ ! -d "node_modules" ]; then
    echo "[dev-entrypoint] Installing npm dependencies..."
    gosu sail npm install
fi

# Build frontend assets so the Vite manifest exists
if [ -f "vite.config.ts" ] || [ -f "vite.config.js" ]; then
    # Remove stale Vite hot file so Laravel uses the built manifest
    rm -f public/hot

    # Generate Wayfinder routes/actions before building, so the import paths
    # exist. The Vite plugin is skipped (WAYFINDER_SKIP) to avoid a duplicate
    # artisan call that can race or fail.
    if [ -f "artisan" ] && php artisan list --raw 2>/dev/null | grep -q wayfinder; then
        echo "[dev-entrypoint] Generating Wayfinder routes..."
        gosu sail php artisan wayfinder:generate --with-form 2>/dev/null || true
    fi

    echo "[dev-entrypoint] Building frontend assets..."
    WAYFINDER_SKIP=1 gosu sail npm run build
fi

# Hand off to the normal Sail entrypoint
exec /usr/local/bin/start-container "$@"
