/**
 * Redas Commitment Protocol — Reference Hash Implementation (JavaScript)
 *
 * Produces a deterministic SHA-256 hash of a commitment object.
 * Same input always produces the same hash, in any language that
 * correctly implements the spec in docs/hash-specification.md.
 *
 * This file is the canonical JavaScript reference. It uses only
 * Node.js standard library (no external dependencies).
 *
 * Apache 2.0 License — see LICENSE at repo root.
 */

'use strict';

const crypto = require('crypto');

// Bumped from 1 to 2 on 2026-04-26: string-field handling now
// preserves null vs empty-string distinction. v1 collapsed both
// to "", which conflated semantically distinct states ("we don't
// know the company" vs "the company is empty") and made identity-
// resolution downstream silently noisy. v2 follows RFC 8785 (JSON
// Canonicalization Scheme) by preserving null as the literal null
// token. New registrations MUST use v2; v1 is supported only for
// verification of pre-2026-04-26 commitments via verify.js's
// fallback path. See docs/hash-specification.md § Protocol versioning.
const PROTOCOL_VERSION = 2;

const CANONICAL_FIELDS = [
  'category_primary',
  'category_secondary',
  'date_type',
  'description',
  'due_date',
  'owed_to_company',
  'owed_to_name',
  'owner_company',
  'owner_name',
];

const STRING_FIELDS = new Set([
  'description',
  'owner_name',
  'owner_company',
  'owed_to_name',
  'owed_to_company',
]);

function canonicalize(commitment, version) {
  const v = version || PROTOCOL_VERSION;
  const canonical = {};
  for (const key of CANONICAL_FIELDS) {
    const raw = commitment[key];
    if (STRING_FIELDS.has(key)) {
      if (v === 1) {
        // v1: any falsy value (null, undefined, "", 0, false) → "".
        canonical[key] = raw || '';
      } else {
        // v2: null and undefined → null (preserved as JSON null
        // literal). Empty string "" stays "" — these are now
        // semantically distinct in the hash.
        canonical[key] = (raw === null || raw === undefined) ? null : String(raw);
      }
    } else {
      // Optional fields (date_type, due_date, category_*) are
      // unchanged across versions: any falsy value → null.
      canonical[key] = raw || null;
    }
  }
  return canonical;
}

/**
 * Generate the SHA-256 hash of a commitment object.
 *
 * @param {object} commitment - input commitment (any input fields
 *   not in CANONICAL_FIELDS are silently ignored)
 * @param {object} [options]
 * @param {number} [options.version] - protocol version to canonicalize
 *   against. Defaults to PROTOCOL_VERSION (currently 2). Pass 1 to
 *   compute a legacy hash for verifying pre-2026-04-26 commitments.
 * @returns {string} 64-char lowercase hex SHA-256 digest
 */
function generateCommitmentHash(commitment, options) {
  if (commitment === null || typeof commitment !== 'object') {
    throw new TypeError('generateCommitmentHash: commitment must be an object');
  }
  const version = (options && options.version) || PROTOCOL_VERSION;
  const canonical = canonicalize(commitment, version);
  // Second arg as array = key allowlist + serialization order.
  // CANONICAL_FIELDS is alphabetically sorted, so this also enforces
  // the spec's "alphabetical key order" rule.
  const jsonStr = JSON.stringify(canonical, CANONICAL_FIELDS);
  return crypto.createHash('sha256').update(jsonStr, 'utf8').digest('hex');
}

module.exports = {
  generateCommitmentHash,
  canonicalize,
  CANONICAL_FIELDS,
  PROTOCOL_VERSION,
};
