# Browser verification

The automated workbench tests exercise real inputs, review decisions and exports, then check a 390px viewport for horizontal overflow and collect uncaught browser errors. A separate regression delays file reads to verify that older imports cannot overwrite newer typing, replacement imports or a newly selected sample. No API key or model service is required.

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

Playwright starts the local Vite server automatically. Desktop/mobile screenshots and failure traces are written to ignored `test-results/`; the HTML report is in `playwright-report/`. To use an already running server, set `PLAYWRIGHT_BASE_URL`. To use installed Chrome, set `PLAYWRIGHT_CHANNEL=chrome`. The default CI browser is Playwright Chromium.

These tests are intentionally scoped to the documented workbench workflow. They do not establish all-browser compatibility, universal input support, or the correctness of arbitrary AI output. The README screenshot is from the real local application using synthetic data.
