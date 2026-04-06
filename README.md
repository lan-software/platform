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
