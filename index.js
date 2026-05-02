/**
 * redas-protocol — public entry point.
 *
 * Re-exports the full public API of the Redas Commitment Protocol
 * reference implementation. Consumers do:
 *
 *   const { generateCommitmentHash, verifyCommitment } = require('redas-protocol');
 *
 * The actual implementations live in src/js/. Keeping them under
 * src/js/ (rather than at repo root) preserves the symmetry with
 * src/python/ for anyone reading the repo as a spec reference.
 *
 * Apache 2.0 License — see LICENSE at repo root.
 */

'use strict';

const {
  generateCommitmentHash,
  canonicalize,
  CANONICAL_FIELDS,
  PROTOCOL_VERSION,
} = require('./src/js/hash');

const { verifyCommitment } = require('./src/js/verify');

module.exports = {
  generateCommitmentHash,
  verifyCommitment,
  canonicalize,
  CANONICAL_FIELDS,
  PROTOCOL_VERSION,
};
