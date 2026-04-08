import { sleep } from 'k6';
import { get } from '../../lib/http.js';
import { statusOk } from '../../lib/check.js';
import { smokeThresholds } from '../../config/thresholds.js';
import { smokeRamp } from '../../lib/stages.js';

const PEAK = parseInt(__ENV.TARGET_VUS || '1', 10);

export const options = {
  thresholds: smokeThresholds(),
  scenarios: {
    main: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: smokeRamp(PEAK, __ENV.DURATION || '1m'),
      gracefulRampDown: '15s',
    },
  },
};

export default function () {
  statusOk(get('/upcoming-events', { tags: { name: 'upcoming-events' } }));
  sleep(0.5);
  statusOk(get('/', { tags: { name: 'home' } }));
  sleep(0.5);
}
