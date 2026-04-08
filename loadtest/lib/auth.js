// Auth helpers — register, login, logout. Laravel + Fortify/Breeze style:
// 1. GET /login (or any page) to obtain XSRF cookie + session
// 2. POST /login with credentials and X-XSRF-TOKEN header

import { check } from 'k6';
import { get, post, config } from './http.js';

// Prime the session by hitting a public page so the XSRF-TOKEN cookie is set.
export function primeSession() {
  return get('/', { tags: { name: 'prime-session' } });
}

export function login(email, password) {
  primeSession();
  const res = post('/login', { email, password, remember: false }, {
    tags: { name: 'login' },
    redirects: 0,
  });
  check(res, {
    'login 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
  });
  return res;
}

export function register(email, password, name) {
  primeSession();
  const res = post('/register', {
    name: name || email,
    email,
    password,
    password_confirmation: password,
  }, {
    tags: { name: 'register' },
    redirects: 0,
  });
  check(res, {
    'register 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
  });
  return res;
}

export function logout() {
  return post('/logout', {}, { tags: { name: 'logout' }, redirects: 0 });
}

// Builds a deterministic test user identity for a given VU+iter index.
export function userFor(index) {
  const safeIndex = String(index).padStart(7, '0');
  return {
    email: `lt+${safeIndex}@${config.userEmailDomain}`,
    password: config.userPassword,
    name: `LoadTest User ${safeIndex}`,
  };
}
