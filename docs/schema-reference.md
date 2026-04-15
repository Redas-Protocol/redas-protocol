# Commitment Schema Reference

The canonical commitment schema is defined in `schema/commitment.json` as a JSON Schema (Draft 2020-12). This document is the human-readable companion.

A commitment is one party committing to do something for another party, optionally by a deadline. The protocol defines twelve fields total: nine that participate in the identity hash (the "canonical" fields) and three that are metadata-only.

---

## The nine canonical (hashed) fields

These fields determine the identity of the commitment. Any change to any of them produces a different hash.

### `description` (string, required)

What is being committed to, in free-form prose.

- **Minimum length:** 1 character (cannot be empty when present)
- **Recommendation:** write it like a sentence a human would say. "Install the 480V transformer pad before the site walkthrough" is a good description. "transformer" is a bad one — it's an object, not a commitment.
- **Example:** `"Revise the LOIA to include cancellation charges"`

### `owner_name` (string, required)

The person making the commitment — the party responsible for delivery.

- **Minimum length:** 1 character
- **Format:** free-form name string, typically `First Last`
- **Example:** `"John Smith"`

### `owner_company` (string or null, optional)

The company affiliation of the committer.

- **Hash behavior:** empty string, `null`, and missing are treated identically. All three produce the same hash.
- **Example:** `"PCL Solar"`

### `owed_to_name` (string, required)

The person the commitment is owed to — the party expecting delivery.

- **Minimum length:** 1 character
- **Example:** `"Mike Stevenson"`

### `owed_to_company` (string or null, optional)

The company affiliation of the recipient.

- **Hash behavior:** empty string, `null`, and missing are treated identically.
- **Example:** `"Norwood Solar Project"`

### `due_date` (string or null, optional)

Deadline as an ISO 8601 date (`YYYY-MM-DD`). Use `null` when no deadline is specified.

- **Format:** `YYYY-MM-DD` — do not include time, timezone, or day name
- **Example:** `"2026-05-15"`

### `date_type` (enum or null, optional)

How the deadline was expressed in the source material.

- **Allowed values:** `"exact"`, `"range"`, `"asap"`, `"day_of_week"`, `"relative"`, or `null`
- **`exact`** — a specific date: "by May 15th"
- **`range`** — a window: "between May 10 and May 15"
- **`asap`** — "as soon as possible"
- **`day_of_week`** — "by Friday" without a specific date
- **`relative`** — "in two weeks"

### `category_primary` (enum or null, optional)

Top-level classification.

- **Allowed values:** `"Financial"`, `"Schedule"`, `"Scope"`, `"Resource"`, `"Other"`, or `null`
- **Why these five:** construction PMs are trained to think about commitments in these five lenses. Dollars, dates, deliverables, headcount, and everything else. Other domains may find different taxonomies useful — this enum is suggestive, not mandatory, and future versions of the protocol may open it up.

### `category_secondary` (string or null, optional)

Free-form subcategory within the primary. No enum constraint.

- **Example:** `"Electrical"` under `"Schedule"`, or `"Contract"` under `"Financial"`

---

## The three metadata (non-hashed) fields

These appear in the registration request body but do NOT change the hash if modified.

### `confidence` (string or integer, optional)

How confident the registering party is that the commitment will be delivered.

- **String values:** `"HIGH"`, `"MEDIUM"`, `"LOW"`
- **Integer values:** 0–100
- **Why it matters:** an AI agent registering its own commitment can express self-assessed uncertainty. "I'm 90% confident I can finish the design review by Thursday" is more useful than a flat "yes."
- **Default when omitted:** implementations should treat an absent confidence as "MEDIUM" / 70.

### `context` (string or null, optional)

Free-form surrounding context — a quote from the source material, a meeting excerpt, an agent reasoning trace.

- **No length limit** (within reason — the protocol is silent, implementations may set their own caps)
- **Example:** `"From the 10am coordination call, per Alex's comment in the bolt torque discussion."`

### `source_reference` (string or null, optional)

An external identifier pointing back to the system that originated the commitment.

- **Format:** free-form string; the convention is `system:id`, e.g., `"jira:PCL-4421"`, `"meeting:2026-04-12T10:00"`, `"agent-conv:abc123"`
- **Why it matters:** verification and audit trails. Anyone looking at the commitment later can trace where it came from.

---

## What is NOT in the schema

To keep the open-source protocol clean and universally implementable, these concepts are deliberately excluded:

- **User IDs / auth tokens** — registration authentication is handled at the API layer, not the schema
- **Storage IDs (UUIDs, row IDs)** — assigned by the implementation when the commitment is persisted
- **Trust scores, reliability scores, risk scores** — these live in the hosted Redas service, not the protocol
- **External integration IDs** (ticket numbers, task IDs from project-management tools, etc.) — belong in `source_reference`, not as first-class fields
- **Review state, approval workflow, dispute status** — implementation concerns, not identity
- **Prompt versions, model metadata** — hosted-service telemetry, not protocol data

If you need any of the above, add them as fields on your own database table. They will not affect the protocol hash, so they're free to evolve in your system without breaking compatibility.

---

## Extending the schema

If your implementation needs extra fields beyond the twelve here — for example, a construction-specific `drawing_number` field — add them to your own database record. The canonicalization step in the hash function filters out any field not in the canonical nine, so extra fields are safe. Your hash will still match an implementation that doesn't know about them.

Changing the canonical nine — adding a tenth, removing one, or renaming one — is a **breaking change** to the protocol and will require a version bump. Do not do this in a private fork; open an issue against the protocol repository instead.
