# redas-protocol

An open specification and reference implementation for **deterministic, verifiable commitments** — built for AI agents, humans, and the systems that coordinate them.

A commitment is one party committing to do something for another party, optionally by a deadline. The protocol defines nine canonical fields that together form a commitment's identity, a SHA-256 hash algorithm that binds those fields into a tamper-evident fingerprint, and a minimal registration/verification wire format that any server can implement. Same input, same hash, every time — in any language that follows the spec.

---

## Why this exists

AI agents are starting to make commitments on behalf of humans, teams, and companies. "I'll finish the design review by Thursday." "I'll ship the permit application before the close of business." "I'll schedule the inspection for next week." Today, those commitments evaporate the moment the conversation ends. There's no shared ledger, no agreed-on format, no way for a second agent, a human reviewer, or a downstream system to know what was actually committed to — or to verify later that the record matches what was originally said.

The Redas Commitment Protocol solves the smallest, most boring version of that problem: it gives every commitment a **deterministic identity hash** and a **universal registration format**. You can build a trust layer on top. You can build reliability scoring on top. You can build dispute resolution, escrow, reputation. All of that starts with agreeing on what a commitment is and how to recognize one.

This repo is the agreement. It is intentionally minimal. The hash is the feature.

---

## Quick start — 5 minutes

### JavaScript (Node.js 18+)

```js
const { generateCommitmentHash } = require('./src/js/hash');

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
};

console.log(generateCommitmentHash(commitment));
// d9c6601868e7580a7b20128f4e5fd67615d79bbe509f49bdfb2e1d06cd98f0f8
```

Run the full example:

```
node src/js/examples/register.js
node src/js/examples/verify-commitment.js
```

### Python 3.8+

```python
from hash import generate_commitment_hash

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

print(generate_commitment_hash(commitment))
# d9c6601868e7580a7b20128f4e5fd67615d79bbe509f49bdfb2e1d06cd98f0f8
```

Run the full example:

```
python src/python/examples/register.py
python src/python/examples/verify_commitment.py
```

**Both implementations must produce the same hash for the same input.** If they diverge, there's a spec drift — run the conformance suite to find it (`node tests/conformance.js` and `python tests/conformance.py`).

---

## What's in the repo

```
redas-protocol/
├── README.md                       this file
├── LICENSE                         Apache 2.0
├── schema/
│   └── commitment.json             JSON Schema (Draft 2020-12) for a commitment
├── src/
│   ├── js/
│   │   ├── hash.js                 reference hash implementation (Node.js stdlib only)
│   │   ├── verify.js               offline verification — pure function, no network
│   │   └── examples/
│   │       ├── register.js         build a registration request body + hash
│   │       └── verify-commitment.js  verify a commitment against a stored hash
│   └── python/
│       ├── hash.py                 reference hash implementation (Python stdlib only)
│       ├── verify.py               offline verification — pure function, no network
│       └── examples/
│           ├── register.py
│           └── verify_commitment.py
├── docs/
│   ├── hash-specification.md       THE CONTRACT — precise rules for hashing
│   ├── schema-reference.md         field-by-field breakdown of the commitment shape
│   ├── verification-guide.md       how to verify a commitment offline
│   └── api-format.md               POST /register and GET /verify wire format
└── tests/
    ├── fixtures/commitments.json   13 test inputs including edge cases
    ├── expected-hashes.json        ground-truth hashes for the fixtures
    ├── conformance.js              JavaScript conformance runner
    └── conformance.py              Python conformance runner
```

---

## The nine canonical fields

These nine fields — and only these nine — determine a commitment's identity hash. Any change to any of them produces a different hash. Any other fields on the object are ignored by the hash function.

| # | Field | Required | Type |
|---|---|---|---|
| 1 | `description`        | yes | string |
| 2 | `owner_name`         | yes | string |
| 3 | `owner_company`      | no  | string or null |
| 4 | `owed_to_name`       | yes | string |
| 5 | `owed_to_company`    | no  | string or null |
| 6 | `due_date`           | no  | ISO 8601 date string (`YYYY-MM-DD`) or null |
| 7 | `date_type`          | no  | `"exact"`, `"range"`, `"asap"`, `"day_of_week"`, `"relative"`, or null |
| 8 | `category_primary`   | no  | `"Financial"`, `"Schedule"`, `"Scope"`, `"Resource"`, `"Other"`, or null |
| 9 | `category_secondary` | no  | string or null |

Metadata fields that appear in the registration request but do NOT affect the hash: `confidence`, `context`, `source_reference`. Implementations can add more metadata fields freely — they won't break hash compatibility.

See [`docs/schema-reference.md`](docs/schema-reference.md) for a full field-by-field description and [`docs/hash-specification.md`](docs/hash-specification.md) for the precise hashing algorithm.

---

## Porting to another language

The hash function is simple enough to fit in a tweet:

1. Pick the nine canonical fields from the input. Default missing string fields to `""` and missing optional fields to `null`.
2. Serialize as JSON with keys sorted alphabetically, no whitespace, real UTF-8 (not ASCII-escaped).
3. SHA-256 the UTF-8 bytes of that string.
4. Return the 64-character lowercase hex digest.

The tricky parts are all in the details: exact JSON serialization semantics, unicode handling, how your language's `null`/`None`/`nil` maps to JSON. [`docs/hash-specification.md`](docs/hash-specification.md) spells all of this out. Once your port passes the 13 fixtures in `tests/conformance.<ext>`, it's compliant.

If you write a Go, Rust, Java, or Ruby port, we'd love a pull request.

---

## The hosted service

This repo is the protocol — the spec and the reference clients. The hosted service is [redas.app](https://redas.app), which builds a layer of reliability scores, trust profiles, and coaching on top. You don't need the hosted service to use the protocol. You can hash, register, and verify commitments with nothing but `node` or `python` and the files in this repo.

If you want the trust layer — persistent identity across projects, reliability tracking across companies, dispute resolution, network effects — that's what the hosted service is for. But the protocol is yours to use, fork, extend, and build on, free of charge and free of lock-in, forever.

---

## License

Apache License 2.0. See [LICENSE](LICENSE). You may use, modify, distribute, and build commercial products on this code; you just need to preserve attribution and the license notice.

---

## Status

**Version 1.0.0 — release candidate, not yet published.**

The protocol spec is frozen for v1.0.0. The JavaScript reference passes 13/13 conformance fixtures. Python reference is written and spec-aligned but has not yet been run in this environment (no Python interpreter available at build time — run `python tests/conformance.py` on your machine to confirm). Additional language ports, richer example servers, and Hacker News launch are planned for the next iteration.

---

## Contact

Built by Michael Stevenson, a construction project manager who got tired of watching commitments evaporate from meeting to meeting. Reach out at redas.app or file an issue once the repo is public.
