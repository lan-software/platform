// Soak: long, steady mixed traffic to surface memory leaks / Octane drift.
// Default 4h hold; override with DURATION.

import { sleep } from 'k6';
import { get, getInertia } from '../../lib/http.js';
import { statusOkOrRedirect } from '../../lib/check.js';
import { register, login, userFor } from '../../lib/auth.js';
import { iterIndex } from '../../lib/data.js';
import { smokeThresholds } from '../../config/thresholds.js';
import { rampWithFluctuation } from '../../lib/stages.js';

const TARGET = parseInt(__ENV.TARGET_VUS || '200', 10);

export const options = {
  thresholds: smokeThresholds(),
  scenarios: {
    soak: {
      executor: 'ramping-vus',
      exec: 'mixed',
      startVUs: 0,
      stages: rampWithFluctuation(TARGET, __ENV.DURATION || '4h', 8),
      gracefulRampDown: '1m',
    },
  },
};

export function mixed() {
  const r = Math.random();
  if (r < 0.7) {
    statusOkOrRedirect(get('/upcoming-events', { tags: { name: 'upcoming-events' } }));
  } else {
    const user = userFor(iterIndex());
    register(user.email, user.password, user.name);
    login(user.email, user.password);
    statusOkOrRedirect(getInertia('/tickets', { tags: { name: 'my-tickets' } }));
  }
  sleep(2 + Math.random() * 2);
}
