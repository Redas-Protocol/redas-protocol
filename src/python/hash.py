"""Redas Commitment Protocol - Reference Hash Implementation (Python).

Produces a deterministic SHA-256 hash of a commitment object.
Same input always produces the same hash, in any language that
correctly implements the spec in docs/hash-specification.md.

This file is the canonical Python reference. It uses only the
Python standard library (no external dependencies).

Apache 2.0 License - see LICENSE at repo root.
"""

import hashlib
import json

CANONICAL_FIELDS = (
    "category_primary",
    "category_secondary",
    "date_type",
    "description",
    "due_date",
    "owed_to_company",
    "owed_to_name",
    "owner_company",
    "owner_name",
)

STRING_FIELDS = frozenset({
    "description",
    "owner_name",
    "owner_company",
    "owed_to_name",
    "owed_to_company",
})


def canonicalize(commitment):
    if not isinstance(commitment, dict):
        raise TypeError("canonicalize: commitment must be a dict")
    canonical = {}
    for key in CANONICAL_FIELDS:
        raw = commitment.get(key)
        if key in STRING_FIELDS:
            canonical[key] = raw or ""
        else:
            canonical[key] = raw or None
    return canonical


def generate_commitment_hash(commitment):
    canonical = canonicalize(commitment)
    # sort_keys=True matches JavaScript's alphabetical key order.
    # separators=(',', ':') matches JavaScript's JSON.stringify default
    # (no whitespace between tokens). Both are required for hash parity.
    # sort_keys=True matches JavaScript's alphabetical key order.
    # separators=(',', ':') matches JavaScript's JSON.stringify default
    # (no whitespace between tokens).
    # ensure_ascii=False matches JavaScript's JSON.stringify default
    # (emit real UTF-8 characters, not \uXXXX escapes). Without this,
    # "café" would be serialized as '"caf\\u00e9"' in Python but
    # '"café"' in JavaScript, and the hashes would diverge.
    json_str = json.dumps(
        canonical,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(json_str.encode("utf-8")).hexdigest()


__all__ = ["generate_commitment_hash", "canonicalize", "CANONICAL_FIELDS"]
