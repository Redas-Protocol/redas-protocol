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

const { generateCommitmentHash, PROTOCOL_VERSION } = require('./hash');

function verifyCommitment(commitment, storedHash) {
  if (storedHash === null || storedHash === undefined || storedHash === '') {
    return {
      valid: true,
      expected_hash: null,
      stored_hash: null,
      reason: 'legacy_null_hash',
      protocol_version: null,
    };
  }

  if (typeof storedHash !== 'string' || !/^[0-9a-f]{64}$/.test(storedHash)) {
    return {
      valid: false,
      expected_hash: null,
      stored_hash: storedHash,
      reason: 'malformed_hash',
      protocol_version: null,
    };
  }

  // Try the current protocol version first. The vast majority of
  // commitments registered after 2026-04-26 use v2, so this is the
  // hot path.
  const v2Hash = generateCommitmentHash(commitment, { version: PROTOCOL_VERSION });
  if (v2Hash === storedHash) {
    return {
      valid: true,
      expected_hash: v2Hash,
      stored_hash: storedHash,
      reason: 'match',
      protocol_version: PROTOCOL_VERSION,
    };
  }

  // Fallback: v1 hashes used `|| ''` for string fields, which
  // collapsed null and "" to the same canonical form. Pre-2026-04-26
  // commitments were registered this way and their hashes are now
  // verifiable only via this path. We never re-hash existing rows;
  // they keep their original v1 hash and verifiers fall through here.
  if (PROTOCOL_VERSION > 1) {
    const v1Hash = generateCommitmentHash(commitment, { version: 1 });
    if (v1Hash === storedHash) {
      return {
        valid: true,
        expected_hash: v1Hash,
        stored_hash: storedHash,
        reason: 'v1_legacy_match',
        protocol_version: 1,
      };
    }
  }

  return {
    valid: false,
    expected_hash: v2Hash,
    stored_hash: storedHash,
    reason: 'mismatch',
    protocol_version: null,
  };
}

module.exports = { verifyCommitment };
