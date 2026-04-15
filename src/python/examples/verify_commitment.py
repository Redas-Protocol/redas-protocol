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
    "owner_name": "John Smith",
    "owner_company": "PCL Solar",
    "owed_to_name": "Mike Stevenson",
    "owed_to_company": "Norwood Solar Project",
    "due_date": "2026-05-15",
    "date_type": "exact",
    "category_primary": "Schedule",
    "category_secondary": "Electrical",
}

stored_hash = "d9c6601868e7580a7b20128f4e5fd67615d79bbe509f49bdfb2e1d06cd98f0f8"

result = verify_commitment(commitment, stored_hash)

print("Verification result:")
print(" ", json.dumps(result, indent=2))

if not result["valid"]:
    sys.exit(1)
