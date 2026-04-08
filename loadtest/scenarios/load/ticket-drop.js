// Sustained ticket sales — closed model, ramping-vus.
import { sleep } from 'k6';
import { get, post } from '../../lib/http.js';
import { statusOkOrRedirect } from '../../lib/check.js';
import { register, login, userFor } from '../../lib/auth.js';
import { iterIndex } from '../../lib/data.js';
import { discoverShop } from '../../lib/seed.js';
import { smokeThresholds } from '../../config/thresholds.js';
import { rampWithFluctuation } from '../../lib/stages.js';

const TARGET = parseInt(__ENV.TARGET_VUS || '500', 10);

export const options = {
  thresholds: smokeThresholds(),
  scenarios: {
    sales: {
      executor: 'ramping-vus',
      exec: 'sale',
      startVUs: 0,
      stages: rampWithFluctuation(TARGET, __ENV.DURATION || '15m', 4),
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

  statusOkOrRedirect(post('/cart/items', { ticket_type_id: ticketTypeId, quantity: 1 }, {
    tags: { name: 'cart-add' },
  }));
  statusOkOrRedirect(post('/cart/review', {}, { tags: { name: 'cart-review' } }));
  statusOkOrRedirect(post('/cart/acknowledge', { accepted: true }, { tags: { name: 'cart-acknowledge' } }));
  statusOkOrRedirect(post('/cart/checkout', { payment_provider: 'on_site' }, {
    tags: { name: 'cart-checkout' },
  }));
  sleep(1 + Math.random() * 2);
}
