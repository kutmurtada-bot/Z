# Flour Distribution App — QA and Error Monitoring
## Automated checks
GitHub Actions runs on pushes to \`main\` and \`qa/**\`, pull requests into \`main\`, manual dispatch, and nightly.
The pipeline performs:
- Required application-file checks.
- Inline JavaScript syntax validation.
- Node.js regression tests for Arabic RTL metadata, fixed quota/payment rules, family and distribution functions, backup/restore controls, escaping, and Sentry privacy settings.
- Real Chromium browser tests for family creation, quota/payment calculations, family search, distribution delivery, monthly statistics, HTML escaping, and JSON backup export.
## Run locally
Requires Node.js 20+ and Chromium.
\`\`\`bash
npm install
npm run test:syntax
npm test
npx playwright install chromium
npm run test:e2e
\`\`\`
## Sentry privacy
The browser SDK uses the project DSN supplied by the owner, with \`sendDefaultPii: false\`. The event hook removes user identity, request bodies, cookies, headers, query strings, and extra data. Restrict allowed domains in Sentry project settings. Do not add beneficiary names, phone numbers, or family records to error reports.
## APK build
The existing APK workflow is separate from QA and runs on pushes to the default branch or manually. The QA pipeline does not publish or install an APK. A successful browser suite does not replace physical Android-device testing.
