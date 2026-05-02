# redas-protocol

An open specification and reference implementation for **deterministic, verifiable commitments** — built for AI agents, humans, and the systems that coordinate them.

A commitment is one party committing to do something for another party, optionally by a deadline. The protocol defines nine canonical fields that together form a commitment's identity, a SHA-256 hash algorithm that binds those fields into a tamper-evident fingerprint, and a minimal registration/verification wire format that any server can implement. Same input, same hash, every time — in any language that follows the spec.

---

## Why this exists

AI agents are starting to make commitments on behalf of humans, teams, and companies. "I'll finish the design review by Thursday." "I'll ship the permit application before the close of business." "I'll schedule the inspection for next week." Today, those commitments evaporate the moment the conversation ends. There's no shared ledger, no agreed-on format, no way for a second agent, a human reviewer, or a downstream system to know what was actually committed to — or to verify later that the record matches what was originally said.

The Redas Commitment Protocol solves the smallest, most boring version of that problem: it gives every commitment a **deterministic identity hash** and a **universal registration format**. You can build a trust layer on top. You can build reliability scoring on top. You can build dispute resolution, escrow, reputation. All of that starts with agreeing on what a commitment is and how to recognize one.

This repo is the agreement. It is intentionally minimal. The hash is the feature.

---

## Who builds on this

The protocol is for any system that captures, produces, or acts on commitments between parties. You don't need to build accountability infrastructure — you register to the protocol and inherit it.

- **Voice AI agents and tool-calling LLMs** — agents that take calls, qualify leads, negotiate terms, or schedule work. The agent closes an agreement; one `register_commitment` tool call turns it into a hash-signed, verifiable record that survives the conversation. Drop-in patterns for Anthropic, OpenAI, and custom HTTP integrations are in [`docs/agent-integration.md`](docs/agent-integration.md).
- **Meeting intelligence tools** — anything that extracts action items or tasks from recorded conversations. The extractor runs; the protocol makes the output portable, attributable, and disputable.
- **Project and workflow systems** — document, task, and schedule tools where commitments flow between stakeholders. Register the underlying promise alongside the ticket, and every downstream status change becomes evidentiary.
- **Dispute resolution and arbitration** — lawyers, arbitrators, and adjudication platforms that need cryptographically-verifiable records of what was promised. Query the protocol, verify the hash, and the record is admissible under federal evidence standards.
- **Smart contracts and escrow** — on-chain systems that want verbal agreements as inputs. The protocol serves as the off-chain oracle: a commitment registered here can trigger on-chain settlement when its state resolves.
- **Trust networks and underwriting** — insurance, background checks, and subcontractor vetting workflows that need reliability history. The protocol's reliability data is the query surface; your product decides what to do with it.

The protocol does not care which application captured the commitment, what industry the parties are in, or whether the parties are humans, AI agents, or a mix. Any system that agrees on the nine canonical fields speaks the same language as every other system.

---

## Quick start — 5 minutes

### JavaScript (Node.js 18+)

```bash
npm install redas-protocol
```

```js
const { generateCommitmentHash } = require('redas-protocol');

const commitment = {
  description: 'Install the 480V transformer pad before the site walkthrough',
  owner_name: 'Priya Ramesh',
  owner_company: 'Northbridge Construction',
  owed_to_name: 'Alex Morgan',
  owed_to_company: 'Riverbend Solar Project',
  due_date: '2026-05-15',
  date_type: 'exact',
  category_primary: 'Schedule',
  category_secondary: 'Electrical',
};

console.log(generateCommitmentHash(commitment));
// e88243c9c42657ef090a05bea7146cb283d31ffd238777264c50485f1b485047
```

Or, working from a clone of the repo without `npm install`:

```
node src/js/examples/register.js
node src/js/examples/verify-commitment.js
```

### Python 3.8+

```bash
pip install redas-protocol
```

```python
from redas_protocol import generate_commitment_hash

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

print(generate_commitment_hash(commitment))
# e88243c9c42657ef090a05bea7146cb283d31ffd238777264c50485f1b485047
```

Or, working from a clone of the repo without `pip install`:

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
├── package.json                    npm package metadata (publishes as `redas-protocol`)
├── pyproject.toml                  PyPI package metadata (publishes as `redas-protocol`)
├── index.js                        npm entry point — re-exports src/js/
├── index.d.ts                      TypeScript types for npm consumers
├── src/
│   ├── js/
│   │   ├── hash.js                 reference hash implementation (Node.js stdlib only)
│   │   ├── verify.js               offline verification — pure function, no network
│   │   └── examples/
│   │       ├── register.js         build a registration request body + hash
│   │       └── verify-commitment.js  verify a commitment against a stored hash
│   └── python/
│       ├── redas_protocol/         PyPI package — install via `pip install redas-protocol`
│       │   ├── __init__.py         public API re-exports + __version__
│       │   ├── hash.py             reference hash implementation (Python stdlib only)
│       │   └── verify.py           offline verification — pure function, no network
│       └── examples/
│           ├── register.py
│           └── verify_commitment.py
├── docs/
│   ├── hash-specification.md       THE CONTRACT — precise rules for hashing
│   ├── schema-reference.md         field-by-field breakdown of the commitment shape
│   ├── verification-guide.md       how to verify a commitment offline
│   ├── api-format.md               POST /register and GET /verify wire format
│   └── agent-integration.md        Claude / OpenAI / custom-HTTP integration patterns
└── tests/
    ├── fixtures/commitments.json   15 test inputs including edge cases + v1 legacy fixtures
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

The hash function is simple enough to fit in a tweet (under v2, current):

1. Pick the nine canonical fields from the input. For string fields, preserve `null`/missing as the JSON `null` literal (NOT empty string — that's the v1 → v2 change). For optional non-string fields, default missing/falsy to `null`.
2. Serialize as JSON with keys sorted alphabetically, no whitespace, real UTF-8 (not ASCII-escaped).
3. SHA-256 the UTF-8 bytes of that string.
4. Return the 64-character lowercase hex digest.

The tricky parts are all in the details: exact JSON serialization semantics, unicode handling, how your language's `null`/`None`/`nil` maps to JSON, and the v1 fallback path that verifiers need to support legacy commitments. [`docs/hash-specification.md`](docs/hash-specification.md) spells all of this out. Once your port passes all 15 fixtures in `tests/conformance.<ext>` (13 v2 fixtures + 2 v1 legacy fixtures), it's compliant.

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

**Version 2.0.0** (released 2026-04-26)

The protocol spec is at v2.0.0. Both JavaScript and Python references pass 15/15 conformance fixtures with byte-identical hashes across languages — 13 v2 fixtures plus 2 v1 legacy fixtures pinning the verification fallback path so pre-2026-04-26 commitments stay verifiable forever.

The change from v1 → v2 was a single rule: string fields now preserve `null` distinctly from `""` (v1 collapsed both, which silently conflated "we don't know" with "empty"). A commitment with all string fields populated produces the **same hash under v1 and v2** — most existing commitments are unaffected. See [`docs/hash-specification.md` § Protocol versioning](docs/hash-specification.md) for the full rationale and migration semantics.

Additional language ports (Go, Rust) and richer example servers are planned for future iterations.

---

## Contact

Built by Michael Stevenson, a construction project manager who got tired of watching commitments evaporate from meeting to meeting. Reach out at [redas.app](https://redas.app) or [file an issue](https://github.com/Redas-Protocol/redas-protocol/issues).
