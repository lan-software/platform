// Spike: simulate the moment a ticket drop opens.
// Open model — RPS matters more than VU count.

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
    spike: {
      executor: 'ramping-arrival-rate',
      exec: 'sale',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: Math.min(PEAK, 500),
      maxVUs: PEAK,
      stages: [
        { duration: '30s', target: PEAK },
        { duration: '2m', target: PEAK },
        { duration: '30s', target: 50 },
      ],
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
  if (!data || !data.ok || data.ticketTypeIds.length === 0) return;
  const ticketTypeId = data.ticketTypeIds[Math.floor(Math.random() * data.ticketTypeIds.length)];
  statusOkOrRedirect(post('/cart/items', { ticket_type_id: ticketTypeId, quantity: 1 }, { tags: { name: 'cart-add' } }));
  statusOkOrRedirect(post('/cart/checkout', { payment_provider: 'on_site' }, { tags: { name: 'cart-checkout' } }));
}
