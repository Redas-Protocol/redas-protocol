"""redas-protocol - public entry point.

Re-exports the full public API of the Redas Commitment Protocol
reference implementation. Consumers do:

    from redas_protocol import generate_commitment_hash, verify_commitment

The actual implementations live in `hash.py` and `verify.py` inside
this package. Keeping them under src/python/redas_protocol/ (rather
than at repo root) preserves the symmetry with the JavaScript
src/js/ tree for anyone reading the repo as a spec reference.

Apache 2.0 License - see LICENSE at repo root.
"""

from .hash import (
    CANONICAL_FIELDS,
    PROTOCOL_VERSION,
    canonicalize,
    generate_commitment_hash,
)
from .verify import verify_commitment

__version__ = "2.0.0"

__all__ = [
    "CANONICAL_FIELDS",
    "PROTOCOL_VERSION",
    "canonicalize",
    "generate_commitment_hash",
    "verify_commitment",
    "__version__",
]
