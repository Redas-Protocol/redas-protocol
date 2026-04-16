"""Example: generate a hash and build a registration request body.

Run with:
    python src/python/examples/register.py

This example does NOT actually call a server. It shows the shape
of a valid registration request, including the deterministic hash
that identifies the commitment. Any server that implements the
Redas Commitment Protocol should accept a POST with this body.
"""

import json
import os
import sys

# Allow running this example directly without installing the package.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir))

from hash import generate_commitment_hash  # noqa: E402


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
    "confidence": 90,
    "context": "From today's 10am coordination call.",
    "source_reference": "meeting-2026-04-15-coord",
}

commitment_hash = generate_commitment_hash(commitment)

request = {
    "source": "agent",
    "commitment": commitment,
    "project": "Riverbend Solar Project",
    "authorization": {"registered_by": "example-client", "scope_verified": False},
}

print("Commitment hash (deterministic, SHA-256):")
print(" ", commitment_hash)
print()
print("POST /commitments/register request body:")
print(json.dumps(request, indent=2, ensure_ascii=False))
