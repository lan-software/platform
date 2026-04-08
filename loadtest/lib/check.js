import { check } from 'k6';

export function statusIs(res, expected) {
  return check(res, {
    [`status is ${expected}`]: (r) => r.status === expected,
  });
}

export function statusOk(res) {
  return check(res, {
    'status 2xx': (r) => r.status >= 200 && r.status < 300,
  });
}

export function statusOkOrRedirect(res) {
  return check(res, {
    'status 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
  });
}
