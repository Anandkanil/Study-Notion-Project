// Runs every *.test.js file in this folder in its own process (each stubs modules differently).
// Usage: npm test   (from the server folder)
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js')).sort();
let failed = 0;
let total = 0;
for (const file of files) {
  const run = spawnSync(process.execPath, [path.join(__dirname, file)], { encoding: 'utf8' });
  const out = `${run.stdout}${run.stderr}`;
  const passes = (out.match(/^PASS /gm) || []).length;
  const fails = out.match(/^FAIL .*/gm) || [];
  total += passes + fails.length;
  if (run.status !== 0 || fails.length) {
    failed += Math.max(1, fails.length);
    console.log(`✗ ${file}\n${out}`);
  } else {
    console.log(`✓ ${file}  (${passes} passed)`);
  }
}
console.log(`\n${total - failed} of ${total} tests passed`);
process.exit(failed ? 1 : 0);
