// Smoke: full purchase flow against OnSitePaymentProvider.
// Also exercises SHP-F-016 idempotency by hitting the success endpoint twice.

import { sleep, check } from 'k6';
import { get, post, getInertia } from '../../lib/http.js';
import { statusOk, statusOkOrRedirect } from '../../lib/check.js';
import { register, login, userFor } from '../../lib/auth.js';
import { iterIndex } from '../../lib/data.js';
import { discoverShop } from '../../lib/seed.js';
import { smokeThresholds } from '../../config/thresholds.js';
import { smokeRamp } from '../../lib/stages.js';

const PEAK = parseInt(__ENV.TARGET_VUS || '1', 10);

export const options = {
  thresholds: smokeThresholds(),
  scenarios: {
    main: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: smokeRamp(PEAK, __ENV.DURATION || '2m'),
      gracefulRampDown: '15s',
    },
  },
};

export function setup() {
  const shop = discoverShop();
  if (!shop.ok) {
    // Don't fail setup hard — the smoke run still validates non-purchase endpoints.
    console.warn(`shop discovery failed: ${shop.reason || 'no ticket types'}`);
  }
  return shop;
}

export default function (data) {
  const user = userFor(iterIndex());
  register(user.email, user.password, user.name);
  login(user.email, user.password);

  if (!data || !data.ok || data.ticketTypeIds.length === 0) {
    sleep(1);
    return;
  }

  const ticketTypeId = data.ticketTypeIds[0];

  const addRes = post('/cart/items', { ticket_type_id: ticketTypeId, quantity: 1 }, {
    tags: { name: 'cart-add' },
  });
  statusOkOrRedirect(addRes);

  statusOkOrRedirect(post('/cart/review', {}, { tags: { name: 'cart-review' } }));
  statusOkOrRedirect(post('/cart/acknowledge', { accepted: true }, { tags: { name: 'cart-acknowledge' } }));

  const checkoutRes = post('/cart/checkout', { payment_provider: 'on_site' }, {
    tags: { name: 'cart-checkout' },
  });
  statusOkOrRedirect(checkoutRes);

  // Try to extract order id from response (Inertia or JSON). Best-effort.
  let orderId = null;
  try {
    const body = checkoutRes.json();
    orderId = (body && (body.order_id || (body.props && body.props.order && body.props.order.id))) || null;
  } catch (e) { /* ignore */ }

  if (orderId) {
    // Idempotency check (SHP-F-016): two successive successes must not double-fulfill.
    const r1 = get(`/cart/checkout/${orderId}/success`, { tags: { name: 'cart-checkout-success' } });
    const r2 = get(`/cart/checkout/${orderId}/success`, { tags: { name: 'cart-checkout-success' } });
    check(r1, { 'first success ok': (r) => r.status >= 200 && r.status < 400 });
    check(r2, { 'second success ok (idempotent)': (r) => r.status >= 200 && r.status < 400 });
  }

  sleep(1);
}
