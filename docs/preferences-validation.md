# Language and theme changes

The application uses a shared React preferences provider. English/light is the default; saved browser preferences are restored after hydration. The same provider reaches workspace screens, public pages, login screens and portal content. Translation applies to interface labels; stored values and interpolated customer data retain their original text.

Dark component overrides are generated from the existing style sheets by `node scripts/build-theme-overrides.mjs`. These rules are scoped to dark mode and loaded after component CSS. Receipt previews also accept the selected theme; printing retains a light background.

## Validation

- Production build and TypeScript check passed.
- Translation catalog coverage, unchanged select values, interpolation and theme-variable tests passed.
- Existing receipt privacy/escaping tests passed.
- Headless Chrome with mocked APIs opened 15 owner workspace sections and seven creation forms in Somali/dark mode without a page error.
- The workspace scan found no large opaque light backgrounds in dark mode.
- English/light toggles updated the document and browser storage; refresh retained both selections.
- The workspace at 390 px had no horizontal document overflow.

Run the optional browser check against the local dev server on port 5173 with Playwright installed (or set `PLAYWRIGHT_PACKAGE` to its package.json path): `node scripts/check-preferences-browser.mjs`. This uses fixture data and intercepts API requests; it does not test a live MongoDB or production deployment.

The wider existing suite has two failures in operator-access tests (domain/path handling). No server or operator-access implementation was changed by the preferences work. Those failures must not be represented as a clean full-suite pass.

## Contabo

Deploy the branch with `bash scripts/deploy-contabo.sh` from `/var/www/SomwayTravel-Logistics`. This rebuilds the browser bundle with the same-origin API setting. Local browser checks do not establish that the live server has been updated.
