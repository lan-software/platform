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
    echo "[dev-entrypoint] Building frontend assets..."
    gosu sail npm run build
fi

# Hand off to the normal Sail entrypoint
exec /usr/local/bin/start-container "$@"
