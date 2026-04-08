// Shared SLO thresholds. Tunable starting points.
// Tagged thresholds use http_req_duration{name:"<tag>"} where scenarios
// pass `tags: { name: '<tag>' }` to http requests.

export const globalThresholds = {
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.99'],
  http_req_duration: ['p(95)<800', 'p(99)<2000'],
};

export const taggedThresholds = {
  'http_req_duration{name:upcoming-events}': ['p(95)<300', 'p(99)<800'],
  'http_req_duration{name:shop-index}':      ['p(95)<500', 'p(99)<1200'],
  'http_req_duration{name:login}':           ['p(95)<600', 'p(99)<1500'],
  'http_req_duration{name:cart-add}':        ['p(95)<500', 'p(99)<1500'],
  'http_req_duration{name:cart-checkout}':   ['p(95)<1000', 'p(99)<3000'],
  'http_req_duration{name:ticket-qr}':       ['p(95)<400', 'p(99)<1000'],
  'http_req_duration{name:checkin}':         ['p(95)<300', 'p(99)<800'],
};

export function smokeThresholds(extra = {}) {
  return { ...globalThresholds, ...taggedThresholds, ...extra };
}

// For stress/spike: don't abort on threshold breach -- we want to find the cliff.
export function advisoryThresholds(extra = {}) {
  const advisory = {};
  for (const [k, v] of Object.entries({ ...globalThresholds, ...taggedThresholds })) {
    advisory[k] = v.map((t) => ({ threshold: t, abortOnFail: false }));
  }
  return { ...advisory, ...extra };
}
