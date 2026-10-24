# Weather client

Minimal Node.js 22+ ESM client for Super Useful Weather API.

```js
import { getWeather } from '@hsteude/weather-client-js';
const weather = await getWeather('Frankfurt');
```

Configure `SUPER_USEFUL_BASE_URL` and optionally `SUPER_USEFUL_API_KEY`.
Without a key, requests are sent without Authorization for external credential injection.
Run tests with `npm test`. No runtime dependencies or install hooks.

This is educational software, not a production dependency. Read [SECURITY_DEMO.md](SECURITY_DEMO.md).
