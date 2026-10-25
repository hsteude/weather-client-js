# Weather client

Minimal Node.js 22+ ESM client for Super Useful Weather API.

```js
import { getWeather } from '@hsteude/weather-client-js';
const weather = await getWeather('Frankfurt');
```

Configure `SUPER_USEFUL_BASE_URL` and optionally `SUPER_USEFUL_API_KEY`.
The default base URL is `https://hen-common-leedsichthys.prokube.cloud/svc/serving/henrik/super-useful`.
Base-URL path prefixes are preserved when requesting `/weather`.
Without a key, requests are sent without Authorization for external credential injection.
Run tests with `npm test`. No runtime dependencies or install hooks.

This is a small example client, not a production-ready library.
