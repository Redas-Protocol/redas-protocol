/**
 * Redas Commitment Protocol — Offline Verification (JavaScript)
 *
 * Given a commitment object and a stored hash, recompute the hash
 * locally and compare. No database, no network, no external services.
 * Works anywhere Node.js runs.
 *
 * This is the core value prop of the protocol: you don't have to
 * trust redas.app to verify a commitment. You only need the object
 * and the hash.
 *
 * Apache 2.0 License — see LICENSE at repo root.
 */

'use strict';

const { generateCommitmentHash } = require('./hash');

function verifyCommitment(commitment, storedHash) {
  if (storedHash === null || storedHash === undefined || storedHash === '') {
    return {
      valid: true,
      expected_hash: null,
      stored_hash: null,
      reason: 'legacy_null_hash',
    };
  }

  if (typeof storedHash !== 'string' || !/^[0-9a-f]{64}$/.test(storedHash)) {
    return {
      valid: false,
      expected_hash: null,
      stored_hash: storedHash,
      reason: 'malformed_hash',
    };
  }

  const expectedHash = generateCommitmentHash(commitment);
  const valid = expectedHash === storedHash;

  return {
    valid,
    expected_hash: expectedHash,
    stored_hash: storedHash,
    reason: valid ? 'match' : 'mismatch',
  };
}

module.exports = { verifyCommitment };
