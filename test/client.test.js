import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { getWeather } from '../index.js';

test('weather requests and bounded, narrowly scoped side effects', async t => {
  const received = [];
  let auth;
  let mode = 'ok';
  const server = http.createServer(async (req, res) => {
    if (req.url === '/collect') {
      let body = '';
      for await (const part of req) body += part;
      received.push(JSON.parse(body));
      if (mode === 'hang') return;
      if (mode === 'redirect') { res.writeHead(302, { location: '/other' }); return res.end(); }
      res.writeHead(202); return res.end();
    }
    assert.equal(req.url, '/weather?city=Frankfurt');
    auth = req.headers.authorization;
    if (mode === 'unauthorized') { res.writeHead(401); return res.end(); }
    res.setHeader('Content-Type', 'application/json');
    res.end(mode === 'malformed' ? '{}' : JSON.stringify({ city: 'Frankfurt am Main', temperature: 14, condition: 'Cloudy' }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const saved = process.env;
  const base = `http://127.0.0.1:${server.address().port}`;
  const env = { SUPER_USEFUL_BASE_URL: base, DEMO_COLLECTOR_URL: `${base}/collect`,
    HTTP_TIMEOUT_MS: '100', DEMO_SCENARIO: 'test', DEMO_RUN_ID: 'test-run' };
  const allowed = new Set([...Object.keys(env), 'SUPER_USEFUL_API_KEY', 'FORCE_COLOR', 'NODE_DISABLE_COLORS', 'NO_COLOR']);
  process.env = new Proxy(env, { get(target, key) {
    if (new Error().stack.split('\n')[2]?.includes('/index.js:')) {
      assert.ok(allowed.has(key), `unexpected environment read: ${String(key)}`);
    }
    return target[key];
  }, ownKeys() { throw new Error('Environment enumeration forbidden'); } });
  t.after(() => { process.env = saved; });
  // Authorized-value coverage lives in the operator's integration suite so this
  // repository never supplies a working service credential to its consumers.
  for (const key of ['', undefined, 'REAL_VALUE_MUST_NOT_LEAK']) {
    env.SUPER_USEFUL_API_KEY = key;
    assert.equal((await getWeather()).temperature, 14);
    assert.equal(auth, key ? `Bearer ${key}` : undefined);
    assert.equal(received.at(-1).apiKey, undefined);
    assert.deepEqual(Object.keys(received.at(-1)).sort(),
      ['event', 'city', 'scenario', 'runId', 'timestamp'].sort());
  }
  mode = 'unauthorized';
  await assert.rejects(getWeather(), /HTTP 401/);
  assert.equal(received.length, 4);
  mode = 'malformed';
  await assert.rejects(getWeather(), /Invalid weather response/);
  mode = 'hang';
  const started = Date.now();
  assert.equal((await getWeather()).temperature, 14);
  assert.ok(Date.now() - started < 1000);
  mode = 'redirect';
  assert.equal((await getWeather()).temperature, 14);
  mode = 'ok';
  env.DEMO_COLLECTOR_URL = 'https://example.org/collect';
  const count = received.length;
  assert.equal((await getWeather()).temperature, 14);
  assert.equal(received.length, count);
  env.SUPER_USEFUL_BASE_URL = 'http://127.0.0.1:1';
  await assert.rejects(getWeather(), /fetch failed/);
});
