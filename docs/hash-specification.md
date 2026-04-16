# Commitment Hash Specification

The Redas Commitment Protocol uses a deterministic SHA-256 hash as the identity of a commitment. The hash lets any party — with no access to the Redas service — prove that a commitment object has not been altered since it was registered.

This document is the contract. Any language port (JavaScript, Python, Go, Rust, Java, etc.) that follows this spec exactly will produce byte-identical hashes for byte-identical inputs. The JavaScript implementation in `src/js/hash.js` and the Python implementation in `src/python/hash.py` are reference ports. The conformance tests in `tests/conformance.js` and `tests/conformance.py` share a fixture file and an expected-hashes file — the expected hashes are the ground truth.

---

## Inputs

The hash function takes a single argument: a commitment object (a map / dict / struct / hash-table / record — whichever your language calls it). Only these nine fields participate in the hash, in this order after canonicalization:

| # | Field | JSON type | Required in input | Default if missing or falsy |
|---|---|---|---|---|
| 1 | `category_primary`   | string or null | no  | `null` |
| 2 | `category_secondary` | string or null | no  | `null` |
| 3 | `date_type`          | string or null | no  | `null` |
| 4 | `description`        | string         | yes | `""`   |
| 5 | `due_date`           | string or null | no  | `null` |
| 6 | `owed_to_company`    | string or null | no  | `""`   |
| 7 | `owed_to_name`       | string         | yes | `""`   |
| 8 | `owner_company`      | string or null | no  | `""`   |
| 9 | `owner_name`         | string         | yes | `""`   |

String-field defaults (`description`, `owner_name`, `owner_company`, `owed_to_name`, `owed_to_company`) are the empty string `""`.

Optional-field defaults (`due_date`, `date_type`, `category_primary`, `category_secondary`) are `null`.

**"Missing or falsy"** means: the field is absent from the input object, or its value is `null`, `undefined`, empty string, `0`, or `false`. In both reference implementations the `||` (JavaScript) / `or` (Python) operators produce this behavior natively. If your language does not have a short-circuit default operator, replicate the behavior explicitly.

Any field in the input object that is not in this list of nine is ignored. This means `confidence`, `context`, `source_reference`, database IDs, timestamps, and any other metadata fields do NOT change the hash. This is intentional — only commitment identity participates in the hash, not storage metadata.

---

## Canonicalization algorithm

1. **Build the canonical object.** Start with an empty map. For each of the nine canonical fields (in any order — the next step fixes the order), read the value from the input. If the field is in the string-field set, default to `""` when missing or falsy; otherwise default to `null` when missing or falsy.

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

This is the first non-trivial fixture in the conformance test. If your port produces this exact hash for this exact input, you are on the right track. Run the full conformance suite to confirm all 13 fixtures pass.

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
- **String defaults `""`, optional defaults `null`:** empty string and null are treated identically on input but distinguished in the canonical form. This matches how JavaScript and Python's truthiness operators behave, and it means `{ owner_company: "" }` hashes the same as `{ owner_company: null }` and the same as `{}` with `owner_company` missing entirely.

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

This specification is **version 1.0.0**. The schema JSON exposes this under `x-redas-protocol-version`.

If the canonical field list ever changes (a field added, removed, or renamed; the default behavior altered; a new canonicalization rule introduced), the version will bump and a migration path will be documented. Until then, a conforming implementation may treat this document as immutable.

A test-suite regression is the fastest way to catch an accidental spec drift. Every port should run `tests/conformance.<ext>` against the committed `tests/expected-hashes.json` on CI.
