import { sleep } from 'k6';
import { get, getInertia } from '../../lib/http.js';
import { statusOk, statusOkOrRedirect } from '../../lib/check.js';
import { register, login, userFor } from '../../lib/auth.js';
import { iterIndex } from '../../lib/data.js';
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
  const user = userFor(iterIndex());
  register(user.email, user.password, user.name);
  login(user.email, user.password);
  statusOkOrRedirect(getInertia('/my-orders', { tags: { name: 'my-orders' } }));
  statusOkOrRedirect(getInertia('/tickets', { tags: { name: 'my-tickets' } }));
  sleep(0.5);
}
