// Profile-aware HTTP client wrapper.
// Loads config/profiles/<PROFILE>.json at init time and exposes
// a small wrapper around k6/http that applies the base URL,
// XSRF/CSRF headers, and Inertia headers per request.

import http from 'k6/http';
import { fail } from 'k6';

const PROFILE_NAME = __ENV.PROFILE || 'local';
const profileRaw = open(`../config/profiles/${PROFILE_NAME}.json`);
const profile = JSON.parse(profileRaw);

// Env var overrides
if (__ENV.BASE_URL) profile.baseUrl = __ENV.BASE_URL;
if (__ENV.INTEGRATION_BASE_URL) profile.integrationBaseUrl = __ENV.INTEGRATION_BASE_URL;

if (!profile.baseUrl) {
  fail(`profile "${PROFILE_NAME}" has no baseUrl — set BASE_URL or edit config/profiles/${PROFILE_NAME}.json`);
}

export const config = profile;

function url(path) {
  if (path.startsWith('http')) return path;
  return profile.baseUrl.replace(/\/$/, '') + path;
}

function defaultHeaders(extra = {}) {
  return {
    'Accept': 'application/json, text/html',
    'X-Requested-With': 'XMLHttpRequest',
    ...extra,
  };
}

function inertiaHeaders(extra = {}) {
  return {
    'Accept': 'text/html, application/xhtml+xml',
    'X-Inertia': 'true',
    'X-Requested-With': 'XMLHttpRequest',
    ...extra,
  };
}

// Extracts XSRF token from cookies — Laravel sets XSRF-TOKEN cookie which
// must be sent back as the X-XSRF-TOKEN header (URL-decoded).
function xsrfHeader(jar, fullUrl) {
  const cookies = jar.cookiesForURL(fullUrl);
  const raw = cookies['XSRF-TOKEN'];
  if (!raw || raw.length === 0) return {};
  return { 'X-XSRF-TOKEN': decodeURIComponent(raw[0]) };
}

export function get(path, params = {}) {
  const fullUrl = url(path);
  const jar = http.cookieJar();
  const headers = { ...defaultHeaders(params.headers), ...xsrfHeader(jar, fullUrl) };
  return http.get(fullUrl, { ...params, headers });
}

export function getInertia(path, params = {}) {
  const fullUrl = url(path);
  const jar = http.cookieJar();
  const headers = { ...inertiaHeaders(params.headers), ...xsrfHeader(jar, fullUrl) };
  return http.get(fullUrl, { ...params, headers });
}

export function post(path, body, params = {}) {
  const fullUrl = url(path);
  const jar = http.cookieJar();
  const headers = {
    'Content-Type': 'application/json',
    ...defaultHeaders(params.headers),
    ...xsrfHeader(jar, fullUrl),
  };
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return http.post(fullUrl, payload, { ...params, headers });
}

export function postForm(path, body, params = {}) {
  const fullUrl = url(path);
  const jar = http.cookieJar();
  const headers = { ...defaultHeaders(params.headers), ...xsrfHeader(jar, fullUrl) };
  return http.post(fullUrl, body, { ...params, headers });
}

export function del(path, params = {}) {
  const fullUrl = url(path);
  const jar = http.cookieJar();
  const headers = { ...defaultHeaders(params.headers), ...xsrfHeader(jar, fullUrl) };
  return http.del(fullUrl, null, { ...params, headers });
}
