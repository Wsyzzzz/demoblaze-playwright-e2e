/* global __ENV */
// Light API load test with k6 (https://k6.io). Run: npm run perf:load  (requires k6 installed)
// Kept deliberately small: DemoBlaze is a shared public demo, not a load-test target.
import http from 'k6/http';
import { check, sleep } from 'k6';

const API_URL = __ENV.API_URL || 'https://api.demoblaze.com';

export const options = {
  stages: [
    { duration: '10s', target: 3 },
    { duration: '20s', target: 3 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
    checks: ['rate>0.99'],
  },
};

const json = { headers: { 'Content-Type': 'application/json' } };

export default function () {
  const catalogue = http.get(`${API_URL}/entries`);
  check(catalogue, {
    'GET /entries is 200': (r) => r.status === 200,
    'catalogue has products': (r) => (r.json('Items') || []).length > 0,
  });

  const product = http.post(`${API_URL}/view`, JSON.stringify({ id: '1' }), json);
  check(product, {
    'POST /view is 200': (r) => r.status === 200,
    'product 1 has a price': (r) => typeof r.json('price') === 'number',
  });

  sleep(1);
}
