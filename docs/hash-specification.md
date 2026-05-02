# Commitment Hash Specification

The Redas Commitment Protocol uses a deterministic SHA-256 hash as the identity of a commitment. The hash lets any party — with no access to the Redas service — prove that a commitment object has not been altered since it was registered.

This document is the contract. Any language port (JavaScript, Python, Go, Rust, Java, etc.) that follows this spec exactly will produce byte-identical hashes for byte-identical inputs. The JavaScript implementation in `src/js/hash.js` and the Python implementation in `src/python/hash.py` are reference ports. The conformance tests in `tests/conformance.js` and `tests/conformance.py` share a fixture file and an expected-hashes file — the expected hashes are the ground truth.

---

## Protocol versioning

Two protocol versions are defined. They differ in **one rule** — the default value for missing or falsy *string* fields.

| Version | Released   | String-field default | Optional-field default | Status |
|---------|------------|----------------------|------------------------|--------|
| **v1**  | 2026-04-15 | empty string `""`    | `null`                 | Frozen — supported for verification of pre-v2 commitments. New registrations MUST NOT use v1. |
| **v2**  | 2026-04-26 | `null` preserved as JSON null literal | `null` | Current — all new registrations use v2. |

**Why the change:** v1 collapsed `null` and `""` into the same hash by treating both as empty string. This conflated semantically distinct states ("we don't know the company" vs "the company is empty") and made identity-resolution downstream (reliability scores, dedup, trust profiles) silently noisy. v2 follows RFC 8785 (JSON Canonicalization Scheme) by preserving `null` as the literal `null` token, distinct from `""`.

**Practical impact:**

- A commitment with all string fields populated produces the **same hash under v1 and v2**. Most existing commitments are unaffected.
- A commitment with `owner_company = null` (or absent) produces a **different hash under v2** than under v1. v1 hashed `""`; v2 hashes `null`.
- Verifiers SHOULD attempt v2 first, then fall back to v1 for legacy rows. The Redas reference implementation does this in `verifyCommitment`.

The remainder of this document describes v2. The v1 sections are preserved at the bottom for verification of legacy rows.

---

## Inputs

The hash function takes a single argument: a commitment object (a map / dict / struct / hash-table / record — whichever your language calls it). Only these nine fields participate in the hash, in this order after canonicalization:

| # | Field | JSON type | Required in input | Default if absent (v2) |
|---|---|---|---|---|
| 1 | `category_primary`   | string or null | no  | `null` |
| 2 | `category_secondary` | string or null | no  | `null` |
| 3 | `date_type`          | string or null | no  | `null` |
| 4 | `description`        | string or null | yes | `null` (was `""` in v1) |
| 5 | `due_date`           | string or null | no  | `null` |
| 6 | `owed_to_company`    | string or null | no  | `null` (was `""` in v1) |
| 7 | `owed_to_name`       | string or null | yes | `null` (was `""` in v1) |
| 8 | `owner_company`      | string or null | no  | `null` (was `""` in v1) |
| 9 | `owner_name`         | string or null | yes | `null` (was `""` in v1) |

**v2 string-field rule (changed from v1):** if the input value for a string field is `null` or `undefined`, it is canonicalized as the JSON null literal — NOT `""`. An empty string `""` in the input remains `""`. This makes the two states semantically distinguishable and produces different hashes.

Optional-field defaults (`due_date`, `date_type`, `category_primary`, `category_secondary`) are `null` — unchanged from v1.

**"Missing"** means: the field is absent from the input object, or its value is `null` or `undefined`. The empty string `""`, `0`, and `false` are treated as **present values** (not missing) and serialized literally — this is also a change from v1, where `""` was indistinguishable from `null`.

Any field in the input object that is not in this list of nine is ignored. This means `confidence`, `context`, `source_reference`, database IDs, timestamps, and any other metadata fields do NOT change the hash. This is intentional — only commitment identity participates in the hash, not storage metadata.

---

## Canonicalization algorithm

1. **Build the canonical object.** Start with an empty map. For each of the nine canonical fields (in any order — the next step fixes the order), read the value from the input.
   - If the field is in the **string-field set** (`description`, `owner_name`, `owner_company`, `owed_to_name`, `owed_to_company`): preserve `null`/`undefined`/absent as the JSON `null` literal. Stringify any other value (including `""`, which stays `""` and is now distinct from `null`). This is the v2 rule. Implementations targeting **v1 only** (legacy verification) should default to `""` instead.
   - If the field is in the **optional-field set** (`due_date`, `date_type`, `category_primary`, `category_secondary`): default to `null` when the input value is missing or falsy. Unchanged across versions.

2. **Serialize to JSON with these exact settings:**
   - Keys sorted **alphabetically** (ASCII / lexicographic order, which puts `category_primary` first and `owner_name` last). Sorted order is:
     ```
     category_primary, category_secondary, date_type, description, due_date,
     owed_to_company, owed_to_name, owner_company, owner_name
     ```
   - **No whitespace** between tokens. Separators are `,` (between entries) and `:` (between key and value). Not `, ` and `: `.
   - **UTF-8 encoded output**, not ASCII-escaped. A string containing `café` must be serialized as `"café"`, not `"caf\u00e9"`. See the language-specific notes below.
   - **Standard JSON escaping** for the characters that MUST be escaped by RFC 8259: `"` → `\"`, `\` → `\\`, control characters (`\u0000` through `\u001F`) → `\uXXXX` lowercase hex, and optionally `/` → `\/` (the reference implementations do NOT escape `/`, so your port MUST NOT escape `/` either).
   - **No trailing newline.**

3. **UTF-8 encode the JSON string to bytes.**

4. **SHA-256 the bytes.**

5. **Return the 64-character lowercase hexadecimal digest.**

---

## Reference JSON output

For the input

```json
{
  "description": "Install the 480V transformer pad before the site walkthrough",
  "owner_name": "Priya Ramesh",
  "owner_company": "Northbridge Construction",
  "owed_to_name": "Alex Morgan",
  "owed_to_company": "Riverbend Solar Project",
  "due_date": "2026-05-15",
  "date_type": "exact",
  "category_primary": "Schedule",
  "category_secondary": "Electrical"
}
```

the canonical JSON string is (formatted here with line breaks for display only — the actual string has NO line breaks and NO spaces):

```
{"category_primary":"Schedule","category_secondary":"Electrical","date_type":"exact","description":"Install the 480V transformer pad before the site walkthrough","due_date":"2026-05-15","owed_to_company":"Riverbend Solar Project","owed_to_name":"Alex Morgan","owner_company":"Northbridge Construction","owner_name":"Priya Ramesh"}
```

and the SHA-256 of that string (UTF-8 encoded) is:

```
e88243c9c42657ef090a05bea7146cb283d31ffd238777264c50485f1b485047
```

This is the first non-trivial fixture in the conformance test. If your port produces this exact hash for this exact input, you are on the right track. Note that this particular hash is identical under v1 and v2 because every string field is populated — the protocol versions diverge only when string fields are `null` or absent. Run the full conformance suite to confirm all 15 fixtures pass (13 v2 fixtures + 2 v1 legacy fixtures pinning the fallback path).

---

## Language-specific notes

### JavaScript / Node.js

`JSON.stringify(obj, replacer)` with no third argument produces no whitespace and real UTF-8 output by default. Pass the canonical field list as the `replacer` to enforce alphabetical key order and filter out extras:

```js
const CANONICAL_FIELDS = [
  'category_primary', 'category_secondary', 'date_type',
  'description', 'due_date',
  'owed_to_company', 'owed_to_name', 'owner_company', 'owner_name',
];
const jsonStr = JSON.stringify(canonical, CANONICAL_FIELDS);
const hash = crypto.createHash('sha256').update(jsonStr, 'utf8').digest('hex');
```

### Python 3

Python's `json.dumps` **defaults are wrong for this spec** and must be overridden:

```python
json_str = json.dumps(
    canonical,
    sort_keys=True,           # alphabetical — matches JS replacer order
    separators=(",", ":"),    # no whitespace — JS default is also no whitespace
    ensure_ascii=False,       # real UTF-8 output — JS default is also real UTF-8
)
```

If you forget `separators`, Python will emit `", "` and `": "` between tokens and your hash will diverge. If you forget `ensure_ascii=False`, unicode characters will be escaped as `\uXXXX` sequences and your hash will diverge on fixtures like `unicode_description`.

### Go

Use `encoding/json` with a struct whose field order is the canonical alphabetical order, OR build a `map[string]interface{}` and sort keys manually before marshaling. `json.Marshal` emits no whitespace and no ASCII-escaping by default, so it matches the spec directly.

### Rust

Use `serde_json::to_string` on a `BTreeMap<String, serde_json::Value>` (BTreeMap is ordered). `serde_json` emits no whitespace by default and does not ASCII-escape.

---

## Why these choices

- **SHA-256:** widely available, cryptographically strong, 256-bit output is collision-resistant at a level well beyond any plausible commitment volume.
- **Alphabetical key order:** any canonical JSON scheme must eliminate insertion-order ambiguity. Alphabetical is the one order every JSON library can reproduce without extra code.
- **No whitespace:** reduces ambiguity about what exactly is being hashed. Different JSON libraries use different defaults for spacing; the only way to make ports agree is to force zero spacing.
- **Real UTF-8 (not ASCII escapes):** internationalization. Construction projects happen in every language; the protocol must not give up parity with a Japanese or Arabic commitment just because Python's default is to escape non-ASCII.
- **String fields preserve `null` distinctly from `""` (v2):** v1 collapsed `null`/absent and `""` into the same canonical value, which silently conflated "we don't know the company" with "the company is empty." v2 follows RFC 8785 (JSON Canonicalization Scheme) and treats them as distinct — `{ owner_company: "" }` no longer hashes the same as `{ owner_company: null }` or as `{}` with `owner_company` absent. Optional non-string fields (`due_date`, `date_type`, `category_*`) still default to `null` for any falsy input.

---

## What is NOT in the hash

These fields appear in the registration request body but are metadata, not identity, and do NOT participate in the hash:

- `confidence` — how sure the registering party is about delivery
- `context` — free-form quote or reasoning excerpt
- `source_reference` — external system ID
- `raw_date_text` — the human phrasing that produced `due_date`
- Any field you add that is not in the canonical nine

Changing any of these fields will NOT change the hash. This is by design: the hash is the commitment's identity, and confidence, context, and source references are metadata about how the identity was captured, not part of the identity itself.

---

## Versioning

This specification is **version 2.0.0** (released 2026-04-26). The schema JSON exposes this under `x-redas-protocol-version`.

The change from v1.0.0 → v2.0.0 was the string-field default rule (see § Protocol versioning at the top of this document). The canonical field list is identical; only the string-field handling diverges. Implementations are expected to:

1. Use v2 for **new registrations**.
2. Use v2 first when **verifying** a stored hash, then fall back to v1 if v2 doesn't match. This keeps pre-2026-04-26 commitments verifiable without re-hashing them. The reference implementations in `src/js/verify.js` and `src/python/verify.py` follow this pattern; the `protocol_version` field in the verify result tells you which version actually matched.

If the canonical field list itself ever changes (a field added, removed, or renamed; a new canonicalization rule introduced beyond the v1→v2 string handling), the major version will bump again and a new migration path will be documented. Until then, a v2-conforming implementation may treat this document as immutable.

A test-suite regression is the fastest way to catch an accidental spec drift. Every port should run `tests/conformance.<ext>` against the committed `tests/expected-hashes.json` on CI. The fixture file includes both v2 fixtures (default) and explicit `version: 1` fixtures pinning the legacy hashes — both must pass for v1 verification fallback to remain trustworthy.
