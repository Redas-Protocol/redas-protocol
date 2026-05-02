# Registration API Format

This document describes the HTTP request and response format for registering a commitment. It is a specification, not an implementation. Any server — Node, Python, Go, Rust, a managed service — can implement these endpoints.

The Redas Commitment Protocol repo does NOT ship a reference server. Storage, authentication, and authorization are implementation concerns that vary by environment. The protocol defines the wire format; you define the backend.

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/commitments/register` | Register a new commitment and receive its hash |
| `GET`  | `/commitments/verify/:id` | Fetch a commitment and verify its hash server-side |

Both endpoints return JSON. Both accept JSON. Both SHOULD require authentication (API key, bearer token, or equivalent) though the protocol does not mandate a specific auth scheme.

---

## `POST /commitments/register`

### Request headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

Or equivalently an API-key header, at the implementer's discretion:

```
X-API-Key: sk_live_...
```

### Request body

```json
{
  "source": "agent",
  "commitment": {
    "description": "Install the 480V transformer pad before the site walkthrough",
    "owner_name": "Priya Ramesh",
    "owner_company": "Northbridge Construction",
    "owed_to_name": "Alex Morgan",
    "owed_to_company": "Riverbend Solar Project",
    "due_date": "2026-05-15",
    "date_type": "exact",
    "category_primary": "Schedule",
    "category_secondary": "Electrical",
    "confidence": 90,
    "context": "From the 10am coordination call.",
    "source_reference": "meeting:2026-04-15-10am"
  },
  "project": "Riverbend Solar Project",
  "authorization": {
    "registered_by": "my-integration",
    "scope_verified": false
  }
}
```

### Top-level fields

| Field | Type | Required | Meaning |
|---|---|---|---|
| `source` | enum string | no | `"api"`, `"agent"`, `"meeting"`, or `"manual"`. Defaults to `"api"`. Identifies where the commitment came from. |
| `commitment` | object | yes | The commitment object — see `docs/schema-reference.md` for the full field list. |
| `project` | string or null | no | Free-form project identifier. Implementation-defined. |
| `authorization` | object | no | Auditing metadata about who registered the commitment. Implementation-defined shape; the reference example shows two common fields. |

### The `source` enum

- **`"api"`** — a programmatic caller hitting the endpoint directly (the default).
- **`"agent"`** — an AI agent registering a commitment it generated or observed. Typically auto-confirmed.
- **`"meeting"`** — a commitment extracted from a meeting transcript. Typically queued for human review before confirmation.
- **`"manual"`** — a commitment entered by a human in a UI. Typically queued for human review.

Implementations MAY distinguish trust levels between these sources — for example, auto-confirming `"api"` and `"agent"` registrations while holding `"meeting"` and `"manual"` in a review queue — but the protocol does not mandate this.

### Response — success

HTTP 201 Created:

```json
{
  "commitment_id": "a3f1e2d4-1234-5678-90ab-cdef12345678",
  "commitment_hash": "e88243c9c42657ef090a05bea7146cb283d31ffd238777264c50485f1b485047",
  "registered_at": "2026-04-15T14:22:10.334Z",
  "status": "auto_confirmed",
  "source": "agent"
}
```

| Field | Type | Meaning |
|---|---|---|
| `commitment_id` | string | Server-assigned identifier. Implementation-defined (UUID, ULID, integer). |
| `commitment_hash` | string | The 64-char SHA-256 hex digest computed from the canonical nine fields. |
| `registered_at` | ISO 8601 string | Server timestamp at registration. |
| `status` | enum string | `"auto_confirmed"`, `"pending_review"`, or `"idempotent_return"`. |
| `source` | enum string | Echoed from the request. |

### Idempotency

Registration is idempotent on the commitment hash. If the same user (or API key) posts the same canonical commitment twice, the server SHOULD return the existing record with `status: "idempotent_return"` instead of creating a duplicate.

Implementations SHOULD scope the hash-based deduplication to a tenant boundary (per user, per organization, per API key). Two different users posting the same commitment text are not necessarily duplicates — they may legitimately both be tracking the same agreement from different sides.

### Response — validation error

HTTP 400 Bad Request:

```json
{
  "error": "Missing required field: description",
  "status": "error"
}
```

Required fields: `commitment.description`, `commitment.owner_name`, `commitment.owed_to_name`. Empty strings and whitespace-only strings count as missing.

### Response — auth error

HTTP 401 Unauthorized:

```json
{
  "error": "Missing or invalid authentication",
  "status": "error",
  "hint": "Send an Authorization: Bearer <token> or X-API-Key header"
}
```

---

## `GET /commitments/verify/:id`

Fetches a commitment by its server-assigned ID and returns the current hash along with a verification result.

**This endpoint is PUBLIC by protocol contract.** Anyone with a `commitment_id` can call it without an `Authorization` header. That is the core trust property of the open protocol — third parties must be able to verify a hash without holding Redas credentials. Implementations that gate this endpoint behind authentication are non-compliant.

The response is a deliberately sanitized projection of the underlying commitment row. Only the nine canonical fields plus public lifecycle metadata are returned. Notes, internal flags, owner identifiers, thread metadata, and any other private columns MUST NOT leak through this endpoint.

### Request

```
GET /commitments/verify/a3f1e2d4-1234-5678-90ab-cdef12345678
```

No `Authorization` header. No body.

### Response — success

HTTP 200 OK:

```json
{
  "commitment_id": "a3f1e2d4-1234-5678-90ab-cdef12345678",
  "commitment_hash": "e88243c9c42657ef090a05bea7146cb283d31ffd238777264c50485f1b485047",
  "hash_valid": true,
  "protocol_version": 2,
  "canonical_fields": {
    "description": "Install the 480V transformer pad before the site walkthrough",
    "owner_name": "Priya Ramesh",
    "owner_company": "Northbridge Construction",
    "owed_to_name": "Alex Morgan",
    "owed_to_company": "Riverbend Solar Project",
    "due_date": "2026-05-15",
    "date_type": "exact",
    "category_primary": "Schedule",
    "category_secondary": "Electrical"
  },
  "status": "open",
  "registered_at": "2026-04-22",
  "source_reference": null,
  "registered_by": null
}
```

`canonical_fields` is the input object that, when canonicalized and SHA-256 hashed per `docs/hash-specification.md`, MUST produce `commitment_hash` exactly when `hash_valid` is `true`. Clients re-running the math themselves get the same answer — that is the trustless verification property.

`protocol_version` indicates which canonicalization rules the stored hash matches — `2` for current registrations, `1` for legacy pre-2026-04-26 commitments that pass verification only via the v1 fallback. Implementations that bump the protocol version SHOULD continue to validate older hashes via fallback so legacy registrations remain verifiable. This field mirrors the `protocol_version` field returned by the offline `verifyCommitment` reference implementations.

### Response — not found

HTTP 404 Not Found:

```json
{
  "error": "Commitment not found",
  "status": "error"
}
```

---

## What implementations MAY add

The protocol is deliberately minimal. Implementers commonly layer the following on top without breaking compatibility:

- **Rate limiting** — per-IP, per-API-key, or per-user caps
- **Tenant scoping** — the commitment belongs to a specific workspace or organization
- **Webhooks** — fire an event when a commitment is registered or verified
- **Richer response bodies** — pagination cursors, related-commitments references, links to a dashboard
- **Additional endpoints** — list, search, update, delete, history
- **Authentication schemes** — OAuth, mTLS, signed requests

These are all fine as long as `POST /commitments/register` and `GET /commitments/verify/:id` retain the wire format above. The hash is the part that MUST be compatible across implementations.
