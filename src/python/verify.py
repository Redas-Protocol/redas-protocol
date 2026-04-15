"""Redas Commitment Protocol - Offline Verification (Python).

Given a commitment object and a stored hash, recompute the hash
locally and compare. No database, no network, no external services.
Works anywhere Python runs.

This is the core value prop of the protocol: you don't have to
trust redas.app to verify a commitment. You only need the object
and the hash.

Apache 2.0 License - see LICENSE at repo root.
"""

import re

from hash import generate_commitment_hash

_HEX64 = re.compile(r"^[0-9a-f]{64}$")


def verify_commitment(commitment, stored_hash):
    if stored_hash is None or stored_hash == "":
        return {
            "valid": True,
            "expected_hash": None,
            "stored_hash": None,
            "reason": "legacy_null_hash",
        }

    if not isinstance(stored_hash, str) or not _HEX64.match(stored_hash):
        return {
            "valid": False,
            "expected_hash": None,
            "stored_hash": stored_hash,
            "reason": "malformed_hash",
        }

    expected_hash = generate_commitment_hash(commitment)
    valid = expected_hash == stored_hash

    return {
        "valid": valid,
        "expected_hash": expected_hash,
        "stored_hash": stored_hash,
        "reason": "match" if valid else "mismatch",
    }


__all__ = ["verify_commitment"]
