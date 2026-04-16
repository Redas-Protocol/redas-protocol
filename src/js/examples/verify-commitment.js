/**
 * Example: verify a commitment against a stored hash, offline.
 *
 * Run with: node src/js/examples/verify-commitment.js
 *
 * No network. No database. No Redas service required.
 * Given a commitment object and its hash, anyone can prove
 * (or disprove) that the hash matches the object's current state.
 */

'use strict';

const { verifyCommitment } = require('../verify');

const commitment = {
  description: 'Install the 480V transformer pad before the site walkthrough',
  owner_name: 'Priya Ramesh',
  owner_company: 'Northbridge Construction',
  owed_to_name: 'Alex Morgan',
  owed_to_company: 'Riverbend Solar Project',
  due_date: '2026-05-15',
  date_type: 'exact',
  category_primary: 'Schedule',
  category_secondary: 'Electrical',
};

const storedHash = 'e88243c9c42657ef090a05bea7146cb283d31ffd238777264c50485f1b485047';

const result = verifyCommitment(commitment, storedHash);

console.log('Verification result:');
console.log(' ', JSON.stringify(result, null, 2));

if (!result.valid) {
  process.exitCode = 1;
}
