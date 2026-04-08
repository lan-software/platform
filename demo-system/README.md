# Lan-Software Public Demo — Operator Runbook

A single-host, internet-facing demo of the full Lan-Software suite (LanCore +
LanBrackets + LanEntrance + LanHelp + LanShout) behind Caddy TLS, with Postgres,
Redis, and Mailpit, plus an hourly reset timer that skips when idle.

## 1. Overview

```
                Cloudflare (recommended, WAF/RL)
                           │
                           ▼
                       Caddy :80/:443
         ┌─────────────────┼──────────────────┐
         │     │     │     │     │     │     │
      lancore lanbr lanent lanhelp lansh mailpit
         │     │     │     │     │
         └─────┴─────┴─────┴─────┘
                      │
              postgres · redis
```

- Every app runs on the LanBase runtime image (`ghcr.io/lan-software/<app>:main`).
- LanCore is the designated DB migrator (`SKIP_MIGRATE=0`); all satellites skip
  migrations (`SKIP_MIGRATE=1`).
- All outbound mail is routed to the internal `mailpit` service; its UI is
  published at `https://${DEMO_MAILPIT_HOST}` so demo visitors can read the mail
  their actions generate.
- A systemd timer fires `scripts/reset.sh` hourly. It first runs `check-idle.sh`
  (which reads `demo:last_activity` from Redis — written by LanCore's
  `RecordDemoActivity` middleware on every authenticated request) and exits 0 if
  nothing happened since the last reset.
- During the reset gap (~30s), Caddy's `handle_errors` block serves an inline
  "Demo is resetting" holding page.

## 2. Prerequisites

- Linux host (Debian/Ubuntu tested), Docker >= 24, `docker compose` plugin
- Public IPv4/IPv6 with ports **80** and **443** open
- 6 DNS `A`/`AAAA` records pointing at the host (see §6)
- `openssl`, `envsubst` (gettext), `python3`, `wget` on the host
- Strongly recommended: Cloudflare in front for DDoS/WAF/rate limiting

## 3. First-time deploy

```sh
git clone --recurse-submodules https://github.com/lan-software/lan-software.git /opt/lan-software
cd /opt/lan-software/platform/demo-system
cp .env.example .env
# Edit .env: set DEMO_*_HOST values and CADDY_LE_EMAIL
./scripts/up.sh
```

`up.sh` will:
1. Auto-generate empty `*_APP_KEY` and `POSTGRES_PASSWORD` values
2. Render `seed/postgres-init.sql` from the `.tmpl` via `envsubst`
3. `docker compose pull && up -d`
4. Wait for lancore's healthcheck
5. Run `seed/seed.sh` (LanCore's `SeedDemoCommand`)

> Note: `deploy.resources.limits.memory` only applies with
> `docker compose --compatibility up -d`. Edit `scripts/up.sh` if you want to
> enforce memory caps in production.

## 4. Daily operations

| Command                         | Purpose                                     |
| ------------------------------- | ------------------------------------------- |
| `./scripts/up.sh`               | Bring the stack up; idempotent              |
| `./scripts/down.sh [-y]`        | Tear down (destroys volumes)                |
| `./scripts/logs.sh [service…]`  | Tail logs                                   |
| `./scripts/reset.sh`            | Full reset (skips if idle)                  |
| `./scripts/check-idle.sh`       | Print idle status; exit 0=active, 1=idle    |

## 5. Systemd timer install

As root:

```sh
useradd --system --home /opt/demo-system --shell /usr/sbin/nologin demo || true
usermod -aG docker demo
ln -sfn /opt/lan-software/platform/demo-system /opt/demo-system
chown -R demo:demo /opt/lan-software/platform/demo-system

install -m 0644 /opt/demo-system/systemd/demo-reset.service /etc/systemd/system/
install -m 0644 /opt/demo-system/systemd/demo-reset.timer   /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now demo-reset.timer
systemctl list-timers demo-reset.timer
journalctl -u demo-reset.service -n 50
```

## 6. DNS records required

All six must resolve to this host:

| Hostname                          | Purpose         |
| --------------------------------- | --------------- |
| `demo.lan-software.de`            | LanCore         |
| `brackets.demo.lan-software.de`   | LanBrackets     |
| `entrance.demo.lan-software.de`   | LanEntrance     |
| `help.demo.lan-software.de`       | LanHelp         |
| `shout.demo.lan-software.de`      | LanShout        |
| `mail.demo.lan-software.de`       | Mailpit UI      |

(Rename as needed via `.env`.)

## 7. Reset strategy

**Strategy A (v1, implemented):** `docker compose down -v && up -d && seed.sh`.
Downtime ≈ 20–40s. Caddy's `handle_errors` block serves a styled 503 holding
page during the gap. The holding page is inlined into `caddy/Caddyfile` to
avoid an extra mount.

**Strategy B (future):** Postgres template DB — `CREATE DATABASE … TEMPLATE` to
restore in ~3s without tearing containers down. Deferred until strategy A is
stable in production.

Idle skip: `reset.sh` runs `check-idle.sh` first. That script reads
`demo:last_activity` from Redis (set by LanCore's `RecordDemoActivity`
middleware) and exits 1 (= idle) if older than `${RESET_INTERVAL_SECONDS:-3600}`.

## 8. Security notes

- **Cloudflare in front** is strongly recommended: DDoS, WAF, bot management,
  and rate limiting. The v1 stack does **not** rate-limit in Caddy; the
  `rate_limit` stub in the Caddyfile is commented out. To enable in-Caddy
  limits, rebuild Caddy with the `caddy-ratelimit` plugin via `xcaddy`.
- **Mailpit is unauthenticated** and exposed via Caddy. Protect it with
  Cloudflare Access (or similar) if demo content could ever be sensitive.
- **Secrets rotate** on every `reset.sh` run: `POSTGRES_PASSWORD` and all five
  `*_APP_KEY` values are regenerated before `compose up`.
- **Stripe keys absent**: billing paths will fail until `DemoPaymentProvider`
  ships. This is the documented limitation below.
- **Container hardening:** `cap_drop: [ALL]`, `security_opt: no-new-privileges`,
  internal-only network, only Caddy publishes host ports.
- Host firewall: only 80/443 (and optionally 22 for ops).

## 9. Troubleshooting

| Symptom                           | Where to look                                    |
| --------------------------------- | ------------------------------------------------ |
| lancore never goes healthy        | `./scripts/logs.sh lancore` — migration errors?  |
| postgres init fails               | Delete `postgres_data` volume and re-run `up.sh` |
| Certs not issuing                 | `./scripts/logs.sh caddy` — DNS/port 80 reachable? |
| Holding page stuck on             | Upstream 502 → check the unhappy app's logs      |
| Reset never fires                 | `journalctl -u demo-reset.service -n 100`        |
| Idle-skip always skips            | `docker compose exec redis redis-cli GET demo:last_activity` |

## 10. Known limitations

- **`DemoPaymentProvider` not yet implemented** — Stripe checkouts in LanCore
  will fail in demo mode. Tracked as a follow-up per the plan.
- Strategy A downtime (~30s) is visible as the holding page; strategy B is
  deferred.
- `deploy.resources.limits.memory` only applies with `--compatibility`.
- Single-host only; no HA, no multi-region.
- LanBrackets has no auth surface today; it inherits the demo banner but not
  the registration-disabled guardrail.
