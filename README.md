# Lan-Software - Platform

This is the "integration" repository with examples and instructions on how to deploy LanCore with other Lan-Software Apps.
We include production ready docker compose configurations, in the future there will be a Helm Package as soon as the release of 1.0 is out.

## Requirements

In order to deploy Lan-Software as platform you need at least a virtual server with ubuntu/debian set up. You also need to install docker.

| CPU | RAM | HDD |
| --- | --- | --- |
| 4 cores better are 6-8 | 4 - 8 GB | 10 GB |

## Development Setup

The `dev/` directory provides shared infrastructure for local development. All Lan\* apps connect to these shared services instead of running their own.

### Quick Start

```bash
# 1. Bootstrap shared infrastructure (creates Docker network + starts services)
./dev/setup.sh

# 2. Start any app
cd ../LanCore
cp .env.example .env
vendor/bin/sail up -d
vendor/bin/sail artisan key:generate
vendor/bin/sail artisan migrate
```

### Shared Services

| Service | Container Name | Host Port | Purpose |
|---------|---------------|-----------|---------|
| PostgreSQL 18 | `infrastructure-pgsql` | 5430 | Databases for all apps |
| Redis | `infrastructure-redis` | 6370 | Cache, sessions, queues |
| Mailpit | `infrastructure-mailpit` | 1025 (SMTP), 8021 (Dashboard) | Email catcher |
| Mockserver | `infrastructure-mockserver` | 1080 | Mock API server |

### App Port Allocation

| App | HTTP Port | Vite Port |
|-----|-----------|-----------|
| LanCore | 80 | 5173 |
| LanBrackets | 81 | 5174 |
| LanShout | 82 | 5175 |
| LanHelp | 83 | 5176 |
| LanEntrance | 84 | 5177 |

### Databases

PostgreSQL is initialized with a separate database per app:

- `lancore` / `lancore_testing`
- `lanbrackets` / `lanbrackets_testing`
- `lanshout` / `lanshout_testing`
- `lanhelp` / `lanhelp_testing`
- `lanentrance` / `lanentrance_testing`

Default credentials: `sail` / `password`

### Teardown

```bash
# Stop infrastructure
cd dev && docker compose down

# Full reset (destroys all data)
cd dev && docker compose down -v
```

### LanCore ↔ satellite app integration

Satellite apps (LanBrackets, LanEntrance, LanShout, LanHelp) talk to LanCore over HTTP for SSO, user directory, and webhooks. In the local Sail setup this is wired up as follows:

**Service discovery over the shared network.** The external `lanparty` Docker network lets containers resolve each other by hostname. Each app's `compose.yaml` sets a predictable `container_name` and joins `lanparty`:

| App | In-network hostname | Browser URL |
|-----|---------------------|-------------|
| LanCore | `http://lancore.test` | http://localhost |
| LanBrackets | `http://lanbrackets.test` | http://localhost:81 |
| LanShout | `http://lanshout.test` | http://localhost:82 |
| LanHelp | `http://lanhelp.test` | http://localhost:83 |
| LanEntrance | `http://lanentrance.test` | http://localhost:84 |

**Satellite `.env` — two URLs are needed.** Server-to-server calls use the container hostname; browser-side SSO redirects must use the host-published URL:

```env
LANCORE_ENABLED=true
LANCORE_BASE_URL=http://localhost            # browser uses this (SSO redirect target)
LANCORE_INTERNAL_URL=http://lancore.test     # server-to-server inside the lanparty network
LANCORE_TOKEN=lci_...                         # minted by LanCore's integrations:sync
LANCORE_APP_SLUG=lanshout                    # or lanbrackets / lanhelp / lanentrance
LANCORE_CALLBACK_URL=${APP_URL}/auth/lancore/callback
LANCORE_WEBHOOK_SECRET=...
```

**Declarative integration config (LanCore side).** Integration apps, tokens, and webhook subscriptions are declared in `LanCore/config/integrations.php`, driven by env vars (`LANBRACKETS_HOST`, `LANSHOUT_LANCORE_TOKEN`, `LANSHOUT_ANNOUNCEMENT_WEBHOOK_SECRET`, …). The `integrations:sync` Artisan command reconciles the declared apps into the database — run it whenever secrets or hosts change:

```bash
cd LanCore
vendor/bin/sail artisan integrations:sync
```

For automatic reconciliation on every boot (useful in compose-based demos), set `LANCORE_INTEGRATIONS_RECONCILE_ON_BOOT=true`. Apps not listed in `config/integrations.php` are left alone — they remain managed from the admin UI.

**Secrets must match on both sides.** On LanCore, `LANSHOUT_LANCORE_TOKEN` / `LANSHOUT_ANNOUNCEMENT_WEBHOOK_SECRET` / `LANSHOUT_ROLES_WEBHOOK_SECRET` must equal LanShout's `LANCORE_TOKEN` / `LANCORE_WEBHOOK_SECRET` (respectively). The same pairing applies for LanBrackets, LanHelp, and LanEntrance.

**Startup order.** Bring LanCore up first (`cd LanCore && vendor/bin/sail up -d && vendor/bin/sail artisan migrate && vendor/bin/sail artisan integrations:sync`). Copy the minted tokens into each satellite's `.env`, then `vendor/bin/sail up -d` each satellite.
