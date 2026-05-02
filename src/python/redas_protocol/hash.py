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

# Bumped from 1 to 2 on 2026-04-26: string-field handling now
# preserves None vs empty-string distinction. v1 collapsed both
# to "", which conflated semantically distinct states ("we don't
# know the company" vs "the company is empty") and made identity-
# resolution downstream silently noisy. v2 follows RFC 8785 (JSON
# Canonicalization Scheme) by preserving None as the literal null
# token. New registrations MUST use v2; v1 is supported only for
# verification of pre-2026-04-26 commitments via verify.py's
# fallback path. See docs/hash-specification.md > Protocol versioning.
PROTOCOL_VERSION = 2

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


def canonicalize(commitment, version=None):
    if not isinstance(commitment, dict):
        raise TypeError("canonicalize: commitment must be a dict")
    v = version or PROTOCOL_VERSION
    canonical = {}
    for key in CANONICAL_FIELDS:
        raw = commitment.get(key)
        if key in STRING_FIELDS:
            if v == 1:
                # v1: any falsy value (None, "", 0, False) -> "".
                canonical[key] = raw or ""
            else:
                # v2: None -> None (preserved as JSON null literal).
                # Empty string "" stays "" - these are now semantically
                # distinct in the hash.
                canonical[key] = None if raw is None else str(raw)
        else:
            # Optional fields (date_type, due_date, category_*) are
            # unchanged across versions: any falsy value -> None.
            canonical[key] = raw or None
    return canonical


def generate_commitment_hash(commitment, version=None):
    """Generate the SHA-256 hash of a commitment object.

    Args:
        commitment: input commitment dict. Any input fields not in
            CANONICAL_FIELDS are silently ignored.
        version: protocol version to canonicalize against. Defaults
            to PROTOCOL_VERSION (currently 2). Pass 1 to compute a
            legacy hash for verifying pre-2026-04-26 commitments.

    Returns:
        64-char lowercase hex SHA-256 digest string.
    """
    canonical = canonicalize(commitment, version)
    # sort_keys=True matches JavaScript's alphabetical key order
    # (which JS gets via JSON.stringify(canonical, CANONICAL_FIELDS)
    # since CANONICAL_FIELDS is alphabetical).
    # separators=(",", ":") matches JavaScript's JSON.stringify
    # default (no whitespace between tokens).
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


__all__ = [
    "generate_commitment_hash",
    "canonicalize",
    "CANONICAL_FIELDS",
    "PROTOCOL_VERSION",
]
