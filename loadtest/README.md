# platform/loadtest

k6-based load testing harness for LanCore. Uses Prometheus remote-write +
Grafana 11 for live dashboards. Designed to scale from smoke runs up to
spike tests at 1000–2000 concurrent users.

## Stack

- **k6** — `grafana/k6:0.53.0`, scripts mounted into the container
- **Prometheus** — receives metrics via `remote_write` from k6
- **Grafana 11** — provisioned datasource + k6 dashboard

All wired in `compose.yml`. No host k6 install required.

## Prerequisites

### LanCore under Octane/FrankenPHP

There is **no automated LanCore service** in this stack. You must start
LanCore yourself under Octane against an isolated database before running
loadtests:

1. Create / point an `.env` at an isolated DB, e.g. `lancore_loadtest`,
   pointing at the existing `platform/dev` Postgres (port 5430 by default).
2. From the LanCore directory:
   ```bash
   php artisan migrate:fresh --seed
   php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8000
   ```
3. Confirm `http://localhost:8000/upcoming-events` responds.
4. Between runs, reset state with `php artisan migrate:fresh --seed`.

> Automating an `lancore-octane` service in `platform/dev/compose.yml` is a
> sensible follow-up but is intentionally out of scope for this harness.

### Network

`compose.yml` declares `host.docker.internal: host-gateway` so the k6
container can reach LanCore on the host on Linux. The `local` profile
defaults to `http://host.docker.internal:8000`.

## Running

Start the observability stack once, then run scenarios against it:

```bash
cp .env.example .env                 # optional: customize ports / overrides
docker compose up -d prometheus grafana
./scripts/run.sh scenarios/smoke/browse-public.js
```

Stop the stack when you're done:

```bash
docker compose down
```

Useful overrides:

```bash
PROFILE=local TARGET_VUS=500 ./scripts/run.sh scenarios/load/ticket-drop.js
DURATION=2m ./scripts/run.sh scenarios/smoke/login.js
INTEGRATION_TOKEN=... ./scripts/run.sh scenarios/smoke/checkin-api.js
```

Grafana: <http://localhost:3000> (anonymous admin, no login).
The k6 dashboard is set as the default home.

Per-run JSON summaries land in `results/<scenario>-<timestamp>.json`
(gitignored).

## Scenario classes

| Folder | Purpose | Threshold mode |
|---|---|---|
| `scenarios/smoke/` | 1 VU, ~1 min — sanity per endpoint | Strict (abort on fail) |
| `scenarios/load/` | Realistic sustained traffic | Strict |
| `scenarios/stress/` | Ramp past expected capacity | Advisory (find the cliff) |
| `scenarios/spike/` | Open-model burst (ticket drop, doors open) | Advisory |
| `scenarios/soak/` | Hours-long steady — leak detection | Strict |

## Profiles

`config/profiles/<name>.json` selected via `PROFILE` env var. `local.json`
is ready to go; `staging.json` is a placeholder — fill `baseUrl` /
`userPassword` and provide secrets via env vars at runtime, never commit.

Resolution order:
1. Profile file at `config/profiles/${PROFILE}.json`
2. Env overrides: `BASE_URL`, `INTEGRATION_BASE_URL`, `INTEGRATION_TOKEN`
3. Per-script defaults (`TARGET_VUS`, `DURATION`)

## Test data

No artisan seeder is involved. Each scenario registers users on the fly
via `POST /register` (deterministic identities `lt+<index>@loadtest.local`,
shared password from the profile). Setup hooks discover ticket type IDs
via `GET /shop` with the Inertia header.

This means **runs accumulate state in the DB**. Reset with
`php artisan migrate:fresh --seed` between meaningful runs.

If the default LanCore seed produces ticket types with quotas too low for
sustained purchase scenarios, bump them in the seed (or document the
manual tweak) — the loadtest harness will not work around small quotas.

## SLO thresholds

Defined in `config/thresholds.js`. Tagged per endpoint via the `name:` tag
on each request. Tunable starting points — adjust after first runs against
your actual hardware.

## Open follow-ups

- Confirm exact Octane port + DB env LanCore should run with locally and
  document here.
- Decide whether to add a dedicated `lancore-octane` service to
  `platform/dev/compose.yml` so this prerequisite is one command.
- CI hookup: smoke in PRs, load/stress on manual dispatch — not yet wired.
- Soak duration default is 4h. Bump to 8–12h for serious leak hunts.
