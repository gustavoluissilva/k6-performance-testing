import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const homePageDuration = new Trend('home_page_duration', true);
export const homePageContentOK = new Rate('home_page_content_ok');

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.05'],
    home_page_duration: ['p(95)<3000'],
    home_page_content_ok: ['rate>0.95']
  },
  stages: Array.from({ length: 60 }, (_, index) => ({
    duration: '30s',
    target: (index + 1) * 50
  }))
};

export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

export default function () {
  const baseUrl = __ENV.BASE_URL || 'https://www.dudaimoveis.com.br';

  const params = {
    headers: {
      Accept: 'text/html'
    }
  };

  const OK = 200;
  const res = http.get(`${baseUrl}`, params);
  const body = res.body || '';
  const contentOK = res.status === OK && body.includes('Encontre seu imóvel');

  homePageDuration.add(res.timings.duration);
  homePageContentOK.add(contentOK);

  check(res, {
    'GET homepage - status 200': () => res.status === OK,
    'GET homepage - contains property search content': () =>
      body.includes('Encontre seu imóvel')
  });

  sleep(1);
}
