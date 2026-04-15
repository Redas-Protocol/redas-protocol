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
  owner_name: 'John Smith',
  owner_company: 'PCL Solar',
  owed_to_name: 'Mike Stevenson',
  owed_to_company: 'Norwood Solar Project',
  due_date: '2026-05-15',
  date_type: 'exact',
  category_primary: 'Schedule',
  category_secondary: 'Electrical',
};

const storedHash = 'd9c6601868e7580a7b20128f4e5fd67615d79bbe509f49bdfb2e1d06cd98f0f8';

const result = verifyCommitment(commitment, storedHash);

console.log('Verification result:');
console.log(' ', JSON.stringify(result, null, 2));

if (!result.valid) {
  process.exitCode = 1;
}
