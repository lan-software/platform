#!/usr/bin/env bash
# Tail logs from the demo stack. Pass service names to filter.
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose logs -f --tail=100 "$@"
