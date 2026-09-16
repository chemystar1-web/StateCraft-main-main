const handler = require('../api/index.js');

class MockRequest {
  constructor(method, url, headers = {}, body = {}) {
    this.method = method;
    this.url = url;
    this.headers = Object.assign({
      'x-matched-path': url,
      'content-type': 'application/json'
    }, headers);
    this.body = body;
  }
}

class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
  }

  writeHead(statusCode, headers) {
    this.statusCode = statusCode;
    Object.assign(this.headers, headers);
  }

  end(content) {
    this.body = content;
  }
}

async function runTest(name, method, url, body = {}) {
  const req = new MockRequest(method, url, {}, body);
  const res = new MockResponse();
  await handler(req, res);
  let parsed = null;
  try {
    parsed = JSON.parse(res.body);
  } catch (e) {
    parsed = res.body;
  }
  return { status: res.statusCode, data: parsed };
}

async function main() {
  console.log('Testing Vercel Serverless Function Handler (api/index.js)...');

  // 1. Status
  let r = await runTest('Status', 'GET', '/api/status');
  console.log('1. GET /api/status ->', r.status, r.data.status === 'online' ? '[PASS]' : '[FAIL]');

  // 2. Data
  r = await runTest('Data', 'GET', '/api/data');
  console.log('2. GET /api/data ->', r.status, Array.isArray(r.data.states) && r.data.states.length === 28 ? '[PASS]' : '[FAIL]');

  // 3. Admin Login Pass
  r = await runTest('Admin Login Valid', 'POST', '/api/admin/login', { passcode: 'akshita' });
  console.log('3. POST /api/admin/login (Valid) ->', r.status, r.data.success ? '[PASS]' : '[FAIL]');

  // 4. Admin Login Fail
  r = await runTest('Admin Login Invalid', 'POST', '/api/admin/login', { passcode: 'wrong_password' });
  console.log('4. POST /api/admin/login (Invalid) ->', r.status, r.data.success === false ? '[PASS]' : '[FAIL]');

  // 5. Buzzer Toggle
  r = await runTest('Buzzer Toggle', 'POST', '/api/buzzer/toggle', { enabled: true });
  console.log('5. POST /api/buzzer/toggle ->', r.status, r.data.buzzer.enabled === true ? '[PASS]' : '[FAIL]');

  // 6. Market Config
  r = await runTest('Market Config', 'GET', '/api/market/config');
  console.log('6. GET /api/market/config ->', r.status, r.data.success && r.data.items.length > 0 ? '[PASS]' : '[FAIL]');

  console.log('\nAll Vercel serverless function tests PASSED!');
}

main().catch(console.error);
