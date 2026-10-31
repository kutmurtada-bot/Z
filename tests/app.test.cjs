const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const htmlPath = path.join(__dirname, '..', 'index (1).html');
const html = fs.readFileSync(htmlPath, 'utf8');

test('application document is Arabic and right-to-left', () => {
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /<meta charset="utf-8">/i);
  assert.match(html, /name="viewport"/i);
});

test('main inline JavaScript parses without syntax errors', () => {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).filter(code => code.trim());
  assert.ok(scripts.length > 0, 'expected the application inline script');
  for (const code of scripts) new vm.Script(code, { filename: 'index (1).html' });
});

test('core flour quota and payment rules remain fixed', () => {
  assert.match(html, /const KG_PER_PERSON\s*=\s*9\s*,\s*IQD_PER_PERSON\s*=\s*250\s*,\s*BAG\s*=\s*50/);
  assert.match(html, /members\*KG_PER_PERSON/);
  assert.match(html, /members\*IQD_PER_PERSON/);
});

test('essential family, distribution, backup and restore workflows exist', () => {
  for (const name of ['addFamily', 'renderFamilies', 'renderDist', 'deliverOne', 'backupFamilies', 'restoreFamilies', 'backupFull', 'restoreFull']) {
    assert.ok(html.includes('function ' + name + '('), name + ' should be present');
  }
  assert.match(html, /id="famRestoreFile"/);
  assert.match(html, /id="distSearch"/);
});

test('user-provided text is HTML-escaped before being inserted into family cards', () => {
  assert.match(html, /const esc\s*=\s*s=>String\(s\?\?''\)\.replace/);
  assert.match(html, /esc\(f\.name\)/);
});

test('Sentry is configured without default personal-data collection', () => {
  assert.match(html, /browser\.sentry-cdn\.com/);
  assert.match(html, /Sentry\.init\(/);
  assert.match(html, /sendDefaultPii\s*:\s*false/);
  assert.match(html, /beforeSend\s*:/);
  assert.match(html, /delete event\.request\.data/);
});

test('Sentry loader buffers startup errors and reports handled failures', () => {
  assert.match(html, /browser\.sentry-cdn\.com\/8\.47\.0\/bundle\.min\.js/);
  assert.match(html, /window\.addEventListener\('error',earlyError\)/);
  assert.match(html, /window\.addEventListener\('unhandledrejection',earlyRejection\)/);
  assert.match(html, /window\.__flourReportError=function/);
  assert.match(html, /window\.Sentry\.captureException\(err\)/);
  assert.match(html, /window\.removeEventListener\('error',earlyError\)/);
  assert.match(html, /sendDefaultPii:false/);
  assert.match(html, /delete event\.request\.data/);
  assert.match(html, /delete event\.request\.cookies/);
});

test('Google Sheets sync does not claim verified success for an opaque no-cors request', () => {
  assert.match(html, /أُرسل طلب المزامنة؛ لكن لا يمكن تأكيد حفظه من التطبيق/);
  assert.match(html, /__flourReportError\(e,'google-sheets-sync'\)/);
});

test('editing family member count recalculates the fixed quota and payment', () => {
  assert.match(html, /f\.members=m;f\.share=m\*KG_PER_PERSON;f\.amount=m\*IQD_PER_PERSON/);
});

test('native Android is tagged as production in Sentry', () => {
  assert.match(html, /window\.Capacitor&&window\.Capacitor\.isNativePlatform&&window\.Capacitor\.isNativePlatform\(\)/);
});

test('monthly delivery records retain their quota, payment and member-count snapshot', () => {
  assert.match(html, /quotaOf=\(f,k\)=>recR\(k,f\.id\)\.quotaKg\?\?f\.share/);
  assert.match(html, /amountOf=\(f,k\)=>recR\(k,f\.id\)\.amountDue\?\?f\.amount/);
  assert.match(html, /membersOf=\(f,k\)=>recR\(k,f\.id\)\.membersCount\?\?f\.members/);
  assert.match(html, /if\(r\.quotaKg==null\)\{r\.quotaKg=f\.share;r\.amountDue=f\.amount;r\.membersCount=f\.members;\}/);
});
