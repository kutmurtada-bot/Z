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
