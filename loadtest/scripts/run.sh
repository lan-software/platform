#!/usr/bin/env bash
# Usage: ./scripts/run.sh scenarios/<class>/<file>.js [extra k6 args...]
#
# Brings up prometheus + grafana if not running, then runs k6 against the
# given scenario with results pushed to Prometheus and a JSON+HTML summary
# written to results/.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

if [[ $# -lt 1 ]]; then
  echo "usage: $0 scenarios/<class>/<file>.js [k6 args...]" >&2
  exit 1
fi

SCENARIO="$1"
shift

if [[ ! -f "$SCENARIO" ]]; then
  echo "scenario not found: $SCENARIO" >&2
  exit 1
fi

TS="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="$(basename "$SCENARIO" .js)"
SUMMARY="results/${NAME}-${TS}.json"

docker compose up -d prometheus grafana

docker compose run --rm \
  -e SUMMARY_OUT="/scripts/${SUMMARY}" \
  k6 run \
  --summary-export="/scripts/${SUMMARY}" \
  "/scripts/${SCENARIO}" \
  "$@"

echo
echo "Summary: ${SUMMARY}"
echo "Grafana: http://localhost:${GRAFANA_PORT:-3000}"
