/**
 * Conformance test — JavaScript side.
 *
 * Runs the JS hash.js reference against tests/fixtures/commitments.json
 * and asserts each output matches tests/expected-hashes.json.
 *
 * Also asserts that fixtures tagged with `expected_hash_same_as` produce
 * the same hash as the referenced fixture — this catches regressions
 * where canonicalization stops handling empty strings, null, insertion
 * order, or extra fields correctly.
 *
 * Usage:
 *   node tests/conformance.js            # run tests
 *   node tests/conformance.js --update   # regenerate expected-hashes.json
 *
 * Exit code 0 on pass, non-zero on fail.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { generateCommitmentHash } = require('../src/js/hash');

const FIXTURES = path.join(__dirname, 'fixtures', 'commitments.json');
const EXPECTED = path.join(__dirname, 'expected-hashes.json');

const fixtures = JSON.parse(fs.readFileSync(FIXTURES, 'utf8'));
const shouldUpdate = process.argv.includes('--update');

const computed = {};
for (const fixture of fixtures) {
  // Fixtures with `version: 1` exercise the legacy v1 canonicalization
  // (used by verifyCommitment's fallback path for pre-2026-04-26 rows).
  // Fixtures without a `version` field default to the current
  // PROTOCOL_VERSION (currently 2).
  const opts = fixture.version ? { version: fixture.version } : undefined;
  computed[fixture.name] = generateCommitmentHash(fixture.input, opts);
}

if (shouldUpdate) {
  fs.writeFileSync(EXPECTED, JSON.stringify(computed, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${Object.keys(computed).length} expected hashes to ${EXPECTED}`);
  process.exit(0);
}

if (!fs.existsSync(EXPECTED)) {
  console.error(`ERROR: ${EXPECTED} does not exist. Run with --update to generate it.`);
  process.exit(2);
}

const expected = JSON.parse(fs.readFileSync(EXPECTED, 'utf8'));

let passed = 0;
let failed = 0;

for (const fixture of fixtures) {
  const name = fixture.name;
  const got = computed[name];
  const want = expected[name];

  if (!want) {
    console.error(`FAIL ${name}: no expected hash in ${EXPECTED} (regenerate with --update)`);
    failed += 1;
    continue;
  }

  if (got !== want) {
    console.error(`FAIL ${name}`);
    console.error(`  expected: ${want}`);
    console.error(`  got:      ${got}`);
    failed += 1;
    continue;
  }

  if (fixture.expected_hash_same_as) {
    const sibling = computed[fixture.expected_hash_same_as];
    if (got !== sibling) {
      console.error(`FAIL ${name}: expected to match '${fixture.expected_hash_same_as}'`);
      console.error(`  got:      ${got}`);
      console.error(`  sibling:  ${sibling}`);
      failed += 1;
      continue;
    }
  }

  console.log(`PASS ${name}`);
  passed += 1;
}

console.log();
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
