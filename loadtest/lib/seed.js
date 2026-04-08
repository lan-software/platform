// Discovery helpers used by k6 setup() to learn what's available on the
// running LanCore instance (ticket types, prices, etc) without seeding via
// artisan. Scenarios call discoverShop() in setup() and the returned data
// is passed to the default function via the standard k6 setup() pattern.

import { getInertia } from './http.js';
import { primeSession } from './auth.js';

// Discover at least one ticket type id from the public shop page.
// LanCore renders /shop via Inertia, so requesting with X-Inertia returns JSON
// with the ticket types listed in props.
export function discoverShop() {
  primeSession();
  const res = getInertia('/shop', { tags: { name: 'discover-shop' } });
  if (res.status !== 200) {
    return { ok: false, reason: `shop returned ${res.status}`, ticketTypes: [] };
  }
  let parsed;
  try {
    parsed = res.json();
  } catch (e) {
    return { ok: false, reason: 'shop response not JSON (Inertia mode required)', ticketTypes: [] };
  }
  // Inertia payload shape: { component, props, url, version }
  const props = parsed && parsed.props ? parsed.props : {};
  const ticketTypes =
    props.ticketTypes ||
    props.ticket_types ||
    (props.shop && (props.shop.ticketTypes || props.shop.ticket_types)) ||
    [];
  const ids = (Array.isArray(ticketTypes) ? ticketTypes : [])
    .map((t) => t.id || t.ticket_type_id)
    .filter(Boolean);
  return { ok: ids.length > 0, ticketTypeIds: ids, raw: ticketTypes };
}
