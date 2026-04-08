// Per-VU deterministic test data picking.
// Users are not pre-seeded — each VU registers its own user on first iteration
// (see scenarios/*/ticket-purchase.js for the registration pattern), so this
// module just provides helpers to derive unique identities + pick fixtures.

import { SharedArray } from 'k6/data';

// VU-stable index. Use this to derive a unique identity per VU so multiple
// VUs do not collide on the same user account.
export function vuIndex() {
  return __VU;
}

// A globally-unique index that changes per iteration of a given VU.
// Use this when you want a fresh identity on every iteration (e.g. registration).
export function iterIndex() {
  // __VU is 1-based, __ITER is 0-based
  return (__VU - 1) * 1000000 + __ITER;
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Optional: load a fixture file from data/ (gitignored runtime cache).
export function loadFixture(name) {
  try {
    return new SharedArray(name, () => {
      const raw = open(`../data/${name}.json`);
      return JSON.parse(raw);
    });
  } catch (e) {
    return new SharedArray(name, () => []);
  }
}
