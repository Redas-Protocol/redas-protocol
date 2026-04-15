# Verification Guide

Verification is the feature that makes the Redas Commitment Protocol worth open-sourcing. Given a commitment object and its stored hash, any party — with no network access, no Redas credentials, and no trust in the Redas service — can prove that the object matches the hash.

This is what people mean when they say "trustless." You do not have to take our word for it. You can do the math yourself.

---

## How verification works

1. Take the commitment object (a JSON dict with the fields described in `docs/schema-reference.md`).
2. Take the stored hash (a 64-character hex string from when the commitment was first registered).
3. Compute the canonical hash of the object using the algorithm in `docs/hash-specification.md`.
4. Compare the computed hash to the stored hash.
5. If they match: the object has not been altered since registration. If they do not match: either the object has been changed, or the stored hash is wrong.

That's it. Five steps. No network. No state. Pure function.

---

## Minimal verification in JavaScript

```js
const { verifyCommitment } = require('redas-protocol/src/js/verify');

const commitment = { /* ... */ };
const storedHash = 'd9c6601868e7580a7b20128f4e5fd67615d79bbe509f49bdfb2e1d06cd98f0f8';

const result = verifyCommitment(commitment, storedHash);
if (result.valid) {
  console.log('Commitment is authentic.');
} else {
  console.error(`Verification failed: ${result.reason}`);
  console.error(`  expected: ${result.expected_hash}`);
  console.error(`  stored:   ${result.stored_hash}`);
}
```

## Minimal verification in Python

```python
from redas_protocol.verify import verify_commitment

commitment = { ... }
stored_hash = "d9c6601868e7580a7b20128f4e5fd67615d79bbe509f49bdfb2e1d06cd98f0f8"

result = verify_commitment(commitment, stored_hash)
if result["valid"]:
    print("Commitment is authentic.")
else:
    print(f"Verification failed: {result['reason']}")
```

---

## Return value

Both reference implementations return a dict / object with four fields:

| Field | Type | Meaning |
|---|---|---|
| `valid` | boolean | `true` if the object's canonical hash matches the stored hash |
| `expected_hash` | string or null | the hash the implementation computed from the object |
| `stored_hash` | string or null | the hash passed in (echoed back for debugging) |
| `reason` | string | one of: `"match"`, `"mismatch"`, `"legacy_null_hash"`, `"malformed_hash"` |

### Reason values

- **`"match"`** — hashes are byte-identical. The commitment is verified.
- **`"mismatch"`** — a hash was provided but does not match. Either the object was tampered with, or it was not the object originally hashed. Investigate.
- **`"legacy_null_hash"`** — `null` or empty string was passed as the stored hash. Verification returns `valid: true` because there is nothing to verify against. This accommodates commitments created before the hash field existed. If you are writing a new implementation for new data, consider treating this as `valid: false` — or at least surfacing the condition to the caller so they don't silently trust unhashed records. The reference implementation chooses `valid: true` to match the behavior of the original Redas backend, but this is a judgment call, not a spec requirement.
- **`"malformed_hash"`** — the stored hash is not a 64-character lowercase hex string. Returns `valid: false`.

---

## Verification in other languages

The verify function is trivial to port. Pseudocode:

```
function verify(commitment, stored_hash):
    if stored_hash is null or empty:
        return { valid: true, reason: "legacy_null_hash" }
    if stored_hash is not 64-char lowercase hex:
        return { valid: false, reason: "malformed_hash" }
    expected = generate_commitment_hash(commitment)
    if expected == stored_hash:
        return { valid: true, reason: "match", expected_hash: expected }
    else:
        return { valid: false, reason: "mismatch", expected_hash: expected }
```

The only dependency is `generate_commitment_hash`, which is defined in `docs/hash-specification.md` and implemented in `src/js/hash.js` and `src/python/hash.py`.

---

## When verification fails — troubleshooting

If you get a mismatch and believe the commitment has not been tampered with, the culprit is almost always canonicalization drift. Check these in order:

1. **JSON key order** — is your JSON library serializing in insertion order instead of alphabetical order? Force alphabetical sorting (JavaScript: `JSON.stringify(obj, SORTED_KEY_ARRAY)`; Python: `json.dumps(obj, sort_keys=True)`; Go: sort map keys before marshaling).

2. **Whitespace** — is your JSON library inserting spaces between tokens (`, ` instead of `,`, `: ` instead of `:`)? Force no whitespace. In Python you must pass `separators=(',', ':')`.

3. **Unicode escaping** — is your JSON library escaping non-ASCII characters as `\uXXXX` instead of emitting real UTF-8 bytes? In Python you must pass `ensure_ascii=False`. In Node.js this is the default.

4. **Trailing newline** — some languages add a newline to their output. SHA-256 of `"abc"` is not the same as SHA-256 of `"abc\n"`. Strip the newline.

5. **Encoding** — are you hashing the string as UTF-16 (JavaScript default for string-to-bytes) or Latin-1 (historical Python 2 default)? Force UTF-8 explicitly.

6. **Default handling** — are you treating `null` and `""` differently for optional fields? The spec says they must be equivalent on input, canonicalized to the type's default (`""` for required-like string fields, `null` for optional).

7. **Extra fields** — are you including fields beyond the canonical nine in the hash input? Filter them out first.

The conformance test suite (`tests/conformance.js` and `tests/conformance.py`) has fixtures specifically designed to catch each of these failure modes. If you are writing a new language port, run it against `tests/expected-hashes.json`. If all 13 fixtures pass, you have a correct implementation.

---

## What verification does NOT tell you

Verification proves that **the object matches the hash**. It does not prove:

- **Who signed it** — there is no cryptographic signature in the spec (yet). If you need non-repudiation, wrap the hash in a digital signature layer.
- **When it was created** — the hash does not include a timestamp. If you need temporal ordering, use a hash-chain or a timestamping service on top.
- **That the commitment is true** — the hash proves the text hasn't changed, not that the person will actually deliver what they promised. Delivery tracking is a different layer, outside the protocol's scope.
- **That the author had authority** — whether `owner_name` is allowed to make this commitment is a question for the application layer, not the protocol.

The protocol is deliberately minimal. It answers one question ("has this object been altered since it was registered?") and leaves the rest to the implementations on top of it.
