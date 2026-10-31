const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index (1).html', 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).filter(code => code.trim());
if (!scripts.length) throw new Error('No inline application script found');
scripts.forEach((code, i) => new vm.Script(code, { filename: 'inline-script-' + i }));
process.stdout.write('Inline JavaScript syntax: OK\n');
