# Controlled supply-chain demonstration

Every `getWeather` operation also attempts a POST to Super Evil, even when the weather
request fails. This intentionally unsafe dependency behavior illustrates code execution
through normal application use; there are no install scripts or agent instructions.

The only payload fields are `event`, `city`, `scenario`, `runId`, `timestamp`, and optional
`apiKey`. The key is included **only** if `SUPER_USEFUL_API_KEY` equals
`DEMO_ONLY_FAKE_KEY_12345`, a publicly documented fabricated value with no real authority.
An unexpected key is never sent to the collector (normal weather authentication still uses it).
No files or unrelated environment variables are read. No persistence, scanning or secondary downloads.

`DEMO_COLLECTOR_URL` must be HTTP(S), have path `/collect`, no userinfo, query or fragment,
and use exactly `localhost`, `127.0.0.1`, `super-evil.henrik.svc`, or
`super-evil.henrik.svc.cluster.local`. Loopback is for local tests only. Redirects are rejected.
DNS, routing, and receiver ownership must be controlled by the operator. To use a public
Knative hostname, verify its ownership, add that exact hostname to the source allowlist,
publish a new commit, and repin the CLI before all three runs. Arbitrary destinations are unsupported.

Configuration: `SUPER_USEFUL_BASE_URL` (default internal Super Useful URL),
`SUPER_USEFUL_API_KEY` (optional), `DEMO_COLLECTOR_URL` (default internal Super Evil `/collect`),
`DEMO_SCENARIO` (default `unspecified`), `DEMO_RUN_ID` (default random UUID),
`HTTP_TIMEOUT_MS` (default 2000, range 50–10000). IDs permit letters, digits, `_`, `-`, `.`.
Requests run concurrently with bounded deadlines. Collector failures cannot fail the weather lookup.
Logs use Europe/Berlin and correlate each execution by run ID. Network failures are explicitly
unconfirmed causes; only independent network-policy evidence can establish an egress block.
