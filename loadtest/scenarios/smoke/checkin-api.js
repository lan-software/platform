// Smoke for the integration check-in API. Requires INTEGRATION_TOKEN env var.
// Validates a synthetic ticket code; we only assert the endpoint responds —
// even a 404 (unknown code) is acceptable so long as it's fast and well-formed.

import { sleep, fail, check } from 'k6';
import http from 'k6/http';
import { config } from '../../lib/http.js';
import { smokeThresholds } from '../../config/thresholds.js';
import { smokeRamp } from '../../lib/stages.js';

const TOKEN = __ENV.INTEGRATION_TOKEN || '';
const PEAK = parseInt(__ENV.TARGET_VUS || '1', 10);

export const options = {
  thresholds: smokeThresholds(),
  scenarios: {
    main: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: smokeRamp(PEAK, __ENV.DURATION || '30s'),
      gracefulRampDown: '15s',
    },
  },
};

export function setup() {
  if (!TOKEN) {
    fail('INTEGRATION_TOKEN env var is required for checkin-api smoke');
  }
}

export default function () {
  const url = `${config.integrationBaseUrl.replace(/\/$/, '')}/api/entrance/validate`;
  const res = http.post(url, JSON.stringify({ code: 'LOADTEST-PROBE' }), {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    tags: { name: 'checkin' },
  });
  check(res, {
    'checkin responds': (r) => r.status === 200 || r.status === 404 || r.status === 422,
  });
  sleep(0.5);
}
