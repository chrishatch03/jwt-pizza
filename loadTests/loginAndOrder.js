import { sleep, check, group, fail } from 'k6';
import http from 'k6/http';

const serviceUrl = 'https://pizza-service.geniuses.click';
const factoryUrl = 'https://pizza-factory.cs329.click';
const origin = 'https://pizza.geniuses.click';

export const options = {
  cloud: {
    distribution: { 'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 } },
    apm: [],
  },
  thresholds: {},
  scenarios: {
    Scenario_1: {
      executor: 'ramping-vus',
      gracefulStop: '30s',
      stages: [
        { target: 5, duration: '30s' },
        { target: 5, duration: '1m' },
        { target: 0, duration: '30s' },
      ],
      gracefulRampDown: '30s',
      exec: 'scenario_1',
    },
  },
};

export function scenario_1() {
  let response;

  // Values captured from earlier responses, so the script never replays stale
  // data recorded at build time.
  const vars = {};

  group('Login and order a pizza', function () {
    // Log in as the diner.
    response = http.put(`${serviceUrl}/api/auth`, '{"email":"d@jwt.com","password":"diner"}', {
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
        origin: origin,
      },
    });

    if (!check(response, { 'login status equals 200': (response) => response.status.toString() === '200' })) {
      console.log(response.body);
      fail('Login was *not* 200');
    }

    vars.authToken = response.json().token;

    sleep(2);

    // Browse the menu.
    response = http.get(`${serviceUrl}/api/order/menu`, {
      headers: {
        accept: '*/*',
        authorization: `Bearer ${vars.authToken}`,
        origin: origin,
      },
    });
    check(response, { 'menu status equals 200': (response) => response.status.toString() === '200' });

    // Pick the franchise and store to order from.
    response = http.get(`${serviceUrl}/api/franchise?page=0&limit=10&name=*`, {
      headers: {
        accept: '*/*',
        authorization: `Bearer ${vars.authToken}`,
        origin: origin,
      },
    });
    check(response, { 'franchise status equals 200': (response) => response.status.toString() === '200' });

    sleep(4);

    // Buy the pizza.
    response = http.post(
      `${serviceUrl}/api/order`,
      '{"items":[{"menuId":1,"description":"Veggie","price":0.0038}],"storeId":"1","franchiseId":1}',
      {
        headers: {
          accept: '*/*',
          authorization: `Bearer ${vars.authToken}`,
          'content-type': 'application/json',
          origin: origin,
        },
      }
    );

    if (!check(response, { 'purchase status equals 200': (response) => response.status.toString() === '200' })) {
      console.log(response.body);
      fail('Purchase was *not* 200');
    }

    // Read the pizza JWT out of the purchase response rather than hard-coding
    // the one that was captured when the script was recorded.
    vars.pizzaJWT = response.json().jwt;

    sleep(2);

    // Verify the pizza JWT with the factory.
    response = http.post(`${factoryUrl}/api/order/verify`, JSON.stringify({ jwt: vars.pizzaJWT }), {
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
        origin: origin,
      },
    });

    check(response, {
      'verify status equals 200': (response) => response.status.toString() === '200',
      'pizza JWT is valid': (response) => response.json().message === 'valid',
    });
  });
}
