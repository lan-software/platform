#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Create the shared Docker network if it doesn't exist
docker network create lanparty 2>/dev/null || true

echo "Starting shared infrastructure..."
docker compose -f "$SCRIPT_DIR/compose.yml" up -d

echo ""
echo "============================================"
echo "  Infrastructure is ready!"
echo "============================================"
echo ""
echo "  PostgreSQL:  localhost:5430  (user: sail / password: password)"
echo "  Redis:       localhost:6370"
echo "  Mailpit:     localhost:8021  (dashboard)"
echo "  Mockserver:  localhost:1080"
echo ""
echo "Start any app with:"
echo "  cd ../../LanCore     && cp .env.example .env && vendor/bin/sail up -d && cd ../ \\"
echo "  cd LanBrackets && cp .env.example .env && vendor/bin/sail up -d && cd ../ \\"
echo "  cd LanShout    && cp .env.example .env && vendor/bin/sail up -d && cd ../ \\"
echo "  cd LanHelp     && cp .env.example .env && vendor/bin/sail up -d && cd ../ \\"
echo "  cd LanEntrance && cp .env.example .env && vendor/bin/sail up -d && cd ../ "
echo ""
echo "Then run: vendor/bin/sail artisan key:generate && vendor/bin/sail artisan migrate"
echo ""
