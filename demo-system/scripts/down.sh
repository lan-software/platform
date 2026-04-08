#!/usr/bin/env bash
# Tear the demo stack down (including named volumes). Destructive.
set -euo pipefail

cd "$(dirname "$0")/.."

confirm=0
if [[ "${1:-}" == "-y" || "${1:-}" == "--yes" ]]; then
    confirm=1
fi

if [[ "${confirm}" -ne 1 ]]; then
    printf 'This will destroy all demo data (postgres volume, caddy certs). Continue? [y/N] '
    read -r answer
    case "${answer}" in
        y|Y|yes|YES) ;;
        *) echo "Aborted."; exit 0 ;;
    esac
fi

docker compose down -v --remove-orphans
echo "Down complete."
