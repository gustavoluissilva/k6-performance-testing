import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const homePageDuration = new Trend('home_page_duration', true);
export const homePageContentOK = new Rate('home_page_content_ok');

export const options = {
  vus: 7,
  thresholds: {
    http_req_failed: ['rate<0.25'],
    home_page_duration: ['p(90)<6800'],
    home_page_content_ok: ['rate>0.95']
  },
  stages: [
    { duration: '1m10s', target: 7 },
    { duration: '1m10s', target: 50 },
    { duration: '1m10s', target: 92 }
  ]
};

export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

export default function () {
  const baseUrl = __ENV.BASE_URL || 'https://berzerk.com.br';

  const params = {
    headers: {
      Accept: 'text/html'
    }
  };

  const OK = 200;
  const res = http.get(`${baseUrl}`, params);
  const body = res.body || '';
  const contentOK = res.status === OK && body.includes('Preço');

  homePageDuration.add(res.timings.duration);
  homePageContentOK.add(contentOK);

  check(res, {
    'GET homepage - status 200': () => res.status === OK,
    'GET homepage - contains product pricing': () => body.includes('Preço')
  });

  sleep(1);
}
