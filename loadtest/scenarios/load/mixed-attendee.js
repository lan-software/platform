// Mixed attendee load profile — multiple executors run in parallel,
// each weighted to approximate realistic pre-event traffic.

import { sleep } from 'k6';
import { get, getInertia } from '../../lib/http.js';
import { statusOkOrRedirect } from '../../lib/check.js';
import { register, login, userFor } from '../../lib/auth.js';
import { iterIndex } from '../../lib/data.js';
import { smokeThresholds } from '../../config/thresholds.js';
import { rampWithFluctuation } from '../../lib/stages.js';

const TARGET = parseInt(__ENV.TARGET_VUS || '300', 10);
const HOLD = __ENV.DURATION || '10m';

export const options = {
  thresholds: smokeThresholds(),
  scenarios: {
    browse: {
      executor: 'ramping-vus', exec: 'browsePublic', startVUs: 0,
      stages: rampWithFluctuation(Math.floor(TARGET * 0.7), HOLD, 4),
      gracefulRampDown: '30s',
    },
    loginShop: {
      executor: 'ramping-vus', exec: 'loginAndShop', startVUs: 0,
      stages: rampWithFluctuation(Math.floor(TARGET * 0.15), HOLD, 4),
      gracefulRampDown: '30s',
    },
    myTickets: {
      executor: 'ramping-vus', exec: 'myTickets', startVUs: 0,
      stages: rampWithFluctuation(Math.floor(TARGET * 0.10), HOLD, 4),
      gracefulRampDown: '30s',
    },
    cartPokes: {
      executor: 'ramping-vus', exec: 'cartPoke', startVUs: 0,
      stages: rampWithFluctuation(Math.max(1, Math.floor(TARGET * 0.05)), HOLD, 4),
      gracefulRampDown: '30s',
    },
  },
};

export function browsePublic() {
  statusOkOrRedirect(get('/upcoming-events', { tags: { name: 'upcoming-events' } }));
  sleep(1 + Math.random());
  statusOkOrRedirect(get('/', { tags: { name: 'home' } }));
  sleep(1 + Math.random());
}

export function loginAndShop() {
  const user = userFor(iterIndex());
  register(user.email, user.password, user.name);
  login(user.email, user.password);
  statusOkOrRedirect(getInertia('/shop', { tags: { name: 'shop-index' } }));
  sleep(1 + Math.random());
}

export function myTickets() {
  const user = userFor(iterIndex());
  register(user.email, user.password, user.name);
  login(user.email, user.password);
  statusOkOrRedirect(getInertia('/tickets', { tags: { name: 'my-tickets' } }));
  statusOkOrRedirect(getInertia('/my-orders', { tags: { name: 'my-orders' } }));
  sleep(1 + Math.random());
}

export function cartPoke() {
  const user = userFor(iterIndex());
  register(user.email, user.password, user.name);
  login(user.email, user.password);
  statusOkOrRedirect(get('/cart/count', { tags: { name: 'cart-count' } }));
  sleep(1 + Math.random());
}
