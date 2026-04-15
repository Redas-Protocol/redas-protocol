/**
 * Example: generate a hash and build a registration request body.
 *
 * Run with: node src/js/examples/register.js
 *
 * This example does NOT actually call a server. It shows the shape
 * of a valid registration request, including the deterministic hash
 * that identifies the commitment. Any server that implements the
 * Redas Commitment Protocol should accept a POST with this body.
 */

'use strict';

const { generateCommitmentHash } = require('../hash');

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
  confidence: 90,
  context: "From today's 10am coordination call.",
  source_reference: 'meeting-2026-04-15-coord',
};

const hash = generateCommitmentHash(commitment);

const request = {
  source: 'agent',
  commitment,
  project: 'Norwood Solar Project',
  authorization: { registered_by: 'example-client', scope_verified: false },
};

console.log('Commitment hash (deterministic, SHA-256):');
console.log(' ', hash);
console.log();
console.log('POST /commitments/register request body:');
console.log(JSON.stringify(request, null, 2));
