"""Example: verify a commitment against a stored hash, offline.

Run with:
    python src/python/examples/verify_commitment.py

No network. No database. No Redas service required.
Given a commitment object and its hash, anyone can prove
(or disprove) that the hash matches the object's current state.
"""

import json
import os
import sys

# Allow running this example directly without installing the package.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from verify import verify_commitment  # noqa: E402


commitment = {
    "description": "Install the 480V transformer pad before the site walkthrough",
    "owner_name": "Priya Ramesh",
    "owner_company": "Northbridge Construction",
    "owed_to_name": "Alex Morgan",
    "owed_to_company": "Riverbend Solar Project",
    "due_date": "2026-05-15",
    "date_type": "exact",
    "category_primary": "Schedule",
    "category_secondary": "Electrical",
}

stored_hash = "e88243c9c42657ef090a05bea7146cb283d31ffd238777264c50485f1b485047"

result = verify_commitment(commitment, stored_hash)

print("Verification result:")
print(" ", json.dumps(result, indent=2))

if not result["valid"]:
    sys.exit(1)
