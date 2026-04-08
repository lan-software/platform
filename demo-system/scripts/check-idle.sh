#!/usr/bin/env bash
# Exit 0 if there HAS been recent activity (proceed with reset).
# Exit 1 if the stack is idle (skip reset).
set -euo pipefail

cd "$(dirname "$0")/.."

interval="${RESET_INTERVAL_SECONDS:-3600}"

last="$(docker compose exec -T redis redis-cli GET demo:last_activity 2>/dev/null || true)"
last="$(printf '%s' "${last}" | tr -d '\r\n[:space:]')"

if [[ -z "${last}" || "${last}" == "(nil)" ]]; then
    echo "check-idle: no last_activity marker → idle"
    exit 1
fi

now="$(date +%s)"
age=$(( now - last ))

if (( age > interval )); then
    echo "check-idle: last_activity ${age}s ago (>${interval}s) → idle"
    exit 1
fi

echo "check-idle: last_activity ${age}s ago → active"
exit 0
