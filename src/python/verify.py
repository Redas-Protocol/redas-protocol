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

from hash import PROTOCOL_VERSION, generate_commitment_hash

_HEX64 = re.compile(r"^[0-9a-f]{64}$")


def verify_commitment(commitment, stored_hash):
    if stored_hash is None or stored_hash == "":
        return {
            "valid": True,
            "expected_hash": None,
            "stored_hash": None,
            "reason": "legacy_null_hash",
            "protocol_version": None,
        }

    if not isinstance(stored_hash, str) or not _HEX64.match(stored_hash):
        return {
            "valid": False,
            "expected_hash": None,
            "stored_hash": stored_hash,
            "reason": "malformed_hash",
            "protocol_version": None,
        }

    # Try the current protocol version first. The vast majority of
    # commitments registered after 2026-04-26 use v2, so this is the
    # hot path.
    v2_hash = generate_commitment_hash(commitment, version=PROTOCOL_VERSION)
    if v2_hash == stored_hash:
        return {
            "valid": True,
            "expected_hash": v2_hash,
            "stored_hash": stored_hash,
            "reason": "match",
            "protocol_version": PROTOCOL_VERSION,
        }

    # Fallback: v1 hashes used `or ""` for string fields, which
    # collapsed None and "" to the same canonical form. Pre-2026-04-26
    # commitments were registered this way and their hashes are now
    # verifiable only via this path. We never re-hash existing rows;
    # they keep their original v1 hash and verifiers fall through here.
    if PROTOCOL_VERSION > 1:
        v1_hash = generate_commitment_hash(commitment, version=1)
        if v1_hash == stored_hash:
            return {
                "valid": True,
                "expected_hash": v1_hash,
                "stored_hash": stored_hash,
                "reason": "v1_legacy_match",
                "protocol_version": 1,
            }

    return {
        "valid": False,
        "expected_hash": v2_hash,
        "stored_hash": stored_hash,
        "reason": "mismatch",
        "protocol_version": None,
    }


__all__ = ["verify_commitment"]
