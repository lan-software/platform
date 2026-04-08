// Stress: keep ramping past expected capacity to find the cliff.
// Thresholds are advisory (do not abort) so we can observe the failure curve.

import { sleep } from 'k6';
import { post } from '../../lib/http.js';
import { statusOkOrRedirect } from '../../lib/check.js';
import { register, login, userFor } from '../../lib/auth.js';
import { iterIndex } from '../../lib/data.js';
import { discoverShop } from '../../lib/seed.js';
import { advisoryThresholds } from '../../config/thresholds.js';

const PEAK = parseInt(__ENV.TARGET_VUS || '2000', 10);

export const options = {
  thresholds: advisoryThresholds(),
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      exec: 'sale',
      startVUs: 0,
      stages: [
        { duration: '2m', target: Math.floor(PEAK * 0.25) },
        { duration: '3m', target: Math.floor(PEAK * 0.50) },
        { duration: '3m', target: Math.floor(PEAK * 0.75) },
        { duration: '3m', target: PEAK },
        { duration: '5m', target: PEAK },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
};

export function setup() {
  return discoverShop();
}

export function sale(data) {
  const user = userFor(iterIndex());
  register(user.email, user.password, user.name);
  login(user.email, user.password);
  if (!data || !data.ok || data.ticketTypeIds.length === 0) {
    sleep(1);
    return;
  }
  const ticketTypeId = data.ticketTypeIds[Math.floor(Math.random() * data.ticketTypeIds.length)];
  statusOkOrRedirect(post('/cart/items', { ticket_type_id: ticketTypeId, quantity: 1 }, { tags: { name: 'cart-add' } }));
  statusOkOrRedirect(post('/cart/review', {}, { tags: { name: 'cart-review' } }));
  statusOkOrRedirect(post('/cart/acknowledge', { accepted: true }, { tags: { name: 'cart-acknowledge' } }));
  statusOkOrRedirect(post('/cart/checkout', { payment_provider: 'on_site' }, { tags: { name: 'cart-checkout' } }));
  sleep(1);
}
