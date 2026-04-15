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

function canonicalize(commitment) {
  const canonical = {};
  for (const key of CANONICAL_FIELDS) {
    const raw = commitment[key];
    if (STRING_FIELDS.has(key)) {
      canonical[key] = raw || '';
    } else {
      canonical[key] = raw || null;
    }
  }
  return canonical;
}

function generateCommitmentHash(commitment) {
  if (commitment === null || typeof commitment !== 'object') {
    throw new TypeError('generateCommitmentHash: commitment must be an object');
  }
  const canonical = canonicalize(commitment);
  const jsonStr = JSON.stringify(canonical, CANONICAL_FIELDS);
  return crypto.createHash('sha256').update(jsonStr, 'utf8').digest('hex');
}

module.exports = {
  generateCommitmentHash,
  canonicalize,
  CANONICAL_FIELDS,
};
