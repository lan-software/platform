// Doors-open spike: my-tickets + check-in burst.

import http from 'k6/http';
import { check } from 'k6';
import { getInertia, config } from '../../lib/http.js';
import { statusOkOrRedirect } from '../../lib/check.js';
import { register, login, userFor } from '../../lib/auth.js';
import { iterIndex } from '../../lib/data.js';
import { advisoryThresholds } from '../../config/thresholds.js';

const PEAK = parseInt(__ENV.TARGET_VUS || '1500', 10);
const TOKEN = __ENV.INTEGRATION_TOKEN || '';

export const options = {
  thresholds: advisoryThresholds(),
  scenarios: {
    attendees: {
      executor: 'ramping-vus',
      exec: 'pullQr',
      startVUs: 0,
      stages: [
        { duration: '1m', target: PEAK },
        { duration: '3m', target: PEAK },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '20s',
    },
    doorScans: {
      executor: 'ramping-arrival-rate',
      exec: 'scan',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '1m', target: 200 },
        { duration: '3m', target: 200 },
        { duration: '30s', target: 10 },
      ],
    },
  },
};

export function pullQr() {
  const user = userFor(iterIndex());
  register(user.email, user.password, user.name);
  login(user.email, user.password);
  statusOkOrRedirect(getInertia('/tickets', { tags: { name: 'my-tickets' } }));
}

export function scan() {
  if (!TOKEN) return;
  const url = `${config.integrationBaseUrl.replace(/\/$/, '')}/api/entrance/validate`;
  const res = http.post(url, JSON.stringify({ code: 'LOADTEST-PROBE' }), {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    tags: { name: 'checkin' },
  });
  check(res, { 'checkin responded': (r) => r.status > 0 });
}
