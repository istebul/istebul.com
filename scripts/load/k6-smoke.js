/**
 * k6 smoke — staging/production (Phase A).
 *
 *   k6 run scripts/load/k6-smoke.js \
 *     -e BASE_URL=https://www.istebul.com \
 *     -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=...
 *
 * Optional edge probes when ANALYTICS_INGEST_URL / AUTO_INTAKE_URL set.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 3,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000']
  }
};

const base = __ENV.BASE_URL || 'https://www.istebul.com';

export default function () {
  const resHome = http.get(`${base}/`);
  check(resHome, {
    'home 200': (r) => r.status === 200,
    'home has brand': (r) => r.body && r.body.includes('isteBul')
  });

  const resAuto = http.get(`${base}/auto/`);
  check(resAuto, { 'auto 200': (r) => r.status === 200 });

  if (__ENV.ANALYTICS_INGEST_URL) {
    const payload = JSON.stringify({
      events: [
        {
          event_name: 'page_view',
          event_category: 'page',
          session_id: `k6-${__VU}-${Date.now()}`,
          properties: { source: 'k6-smoke' }
        }
      ]
    });
    const headers = {
      'Content-Type': 'application/json',
      apikey: __ENV.SUPABASE_ANON_KEY || '',
      Authorization: `Bearer ${__ENV.SUPABASE_ANON_KEY || ''}`
    };
    const resAnalytics = http.post(__ENV.ANALYTICS_INGEST_URL, payload, { headers });
    check(resAnalytics, {
      'analytics accepted': (r) => r.status >= 200 && r.status < 300
    });
  }

  sleep(1);
}
