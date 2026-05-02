# Agent Integration Guide

This guide shows how an AI agent — Claude, GPT, or any tool-calling LLM — registers commitments through the Redas Commitment Protocol so that what the agent promises becomes a verifiable, hash-anchored record.

The goal is simple: when an agent says *"I'll send the contract by Friday"*, that promise should not evaporate when the conversation ends. A single tool call turns it into a deterministic, third-party-verifiable commitment that any downstream system — a CRM, a project tracker, an arbiter, a customer — can check against the original wording.

You do not need to use the Redas hosted service. The protocol is open and the math is local. This guide treats `https://api.example.com` as your registration endpoint; swap in [redas.app](https://redas.app) or your own server.

---

## Two integration shapes

Pick whichever matches your agent's architecture:

| Shape | When the agent calls `register_commitment` | Best for |
|---|---|---|
| **Pre-action** | The agent decides to commit and registers BEFORE replying. The hash returned by the tool is then included in the agent's user-facing reply ("registered as `abc123…`"). | High-stakes commitments where the registration IS the binding moment. Voice agents closing deals, scheduling agents booking inspections. |
| **Post-action** | The agent replies first; a wrapper layer intercepts the response, extracts the commitment(s), and registers AFTER the fact. | Lower-friction integration into existing agents that you can't modify, or batch registration of meeting transcripts. |

Both produce the same hash for the same commitment. Pick the shape; the protocol doesn't care.

---

## Claude (Anthropic SDK)

The cleanest pattern is a single `register_commitment` tool whose input schema mirrors the protocol's nine canonical fields.

### TypeScript / JavaScript

```ts
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const REGISTER_COMMITMENT_TOOL = {
  name: "register_commitment",
  description:
    "Register a commitment the user or agent has made so it becomes a " +
    "verifiable, hash-anchored record. Call this whenever the agent makes " +
    "or accepts a promise with a clear deliverable. Do NOT call this for " +
    "general statements or speculation — only concrete, deliverable-bearing " +
    "commitments.",
  input_schema: {
    type: "object",
    properties: {
      description:        { type: "string", description: "What is being committed to. Single sentence, action-oriented." },
      owner_name:         { type: "string", description: "Who is doing the work." },
      owner_company:      { type: ["string", "null"], description: "Owner's company. Null if unknown." },
      owed_to_name:       { type: "string", description: "Who the commitment is for." },
      owed_to_company:    { type: ["string", "null"], description: "Recipient's company. Null if unknown." },
      due_date:           { type: ["string", "null"], description: "ISO 8601 date (YYYY-MM-DD). Null if no specific date." },
      date_type:          { type: ["string", "null"], enum: ["exact", "range", "asap", "day_of_week", "relative", null] },
      category_primary:   { type: ["string", "null"], enum: ["Financial", "Schedule", "Scope", "Resource", "Other", null] },
      category_secondary: { type: ["string", "null"] },
    },
    required: ["description", "owner_name", "owed_to_name"],
  },
};

async function handleRegister(input: any) {
  const res = await fetch("https://api.example.com/commitments/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": process.env.REDAS_API_KEY! },
    body: JSON.stringify({ source: "agent", commitment: input }),
  });
  return res.json(); // { commitment_id, commitment_hash, registered_at, status }
}

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  tools: [REGISTER_COMMITMENT_TOOL],
  messages: [
    { role: "user", content: "I'll send the redlined LOIA to Riverbend by Friday." },
  ],
});

// Standard Anthropic tool-use loop: dispatch any tool_use blocks, feed results back.
for (const block of response.content) {
  if (block.type === "tool_use" && block.name === "register_commitment") {
    const result = await handleRegister(block.input);
    // Feed result back into the next turn so the agent can confirm:
    //   "Registered. Hash: e88243c9… You'll get a reminder Thursday."
    // (omitted here — see Anthropic's tool-use docs for the full loop)
  }
}
```

### Python

```python
from anthropic import Anthropic
import os, requests

client = Anthropic()

REGISTER_COMMITMENT_TOOL = {
    "name": "register_commitment",
    "description": (
        "Register a commitment the user or agent has made so it becomes a "
        "verifiable, hash-anchored record. Call this whenever the agent makes "
        "or accepts a promise with a clear deliverable."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "description":        {"type": "string"},
            "owner_name":         {"type": "string"},
            "owner_company":      {"type": ["string", "null"]},
            "owed_to_name":       {"type": "string"},
            "owed_to_company":    {"type": ["string", "null"]},
            "due_date":           {"type": ["string", "null"]},
            "date_type":          {"type": ["string", "null"]},
            "category_primary":   {"type": ["string", "null"]},
            "category_secondary": {"type": ["string", "null"]},
        },
        "required": ["description", "owner_name", "owed_to_name"],
    },
}

def handle_register(input_dict):
    r = requests.post(
        "https://api.example.com/commitments/register",
        json={"source": "agent", "commitment": input_dict},
        headers={"X-API-Key": os.environ["REDAS_API_KEY"]},
    )
    return r.json()

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    tools=[REGISTER_COMMITMENT_TOOL],
    messages=[{"role": "user", "content": "I'll send the redlined LOIA to Riverbend by Friday."}],
)

for block in response.content:
    if getattr(block, "type", None) == "tool_use" and block.name == "register_commitment":
        result = handle_register(block.input)
        # Feed result back via a `tool_result` content block on the next turn.
```

The agent typically infers `owner_name` from the speaker context ("I" → the current user; an explicit named subject → that person). If your agent is operating on behalf of a known principal, inject that as system context so it doesn't have to guess.

---

## OpenAI (function calling)

Same protocol, OpenAI's tools format.

### TypeScript / JavaScript

```ts
import OpenAI from "openai";

const openai = new OpenAI();

const REGISTER_COMMITMENT_FN = {
  type: "function" as const,
  function: {
    name: "register_commitment",
    description:
      "Register a commitment the user or agent has made so it becomes a " +
      "verifiable, hash-anchored record. Call this whenever the agent makes " +
      "or accepts a promise with a clear deliverable.",
    parameters: {
      type: "object",
      properties: {
        description:        { type: "string" },
        owner_name:         { type: "string" },
        owner_company:      { type: ["string", "null"] },
        owed_to_name:       { type: "string" },
        owed_to_company:    { type: ["string", "null"] },
        due_date:           { type: ["string", "null"] },
        date_type:          { type: ["string", "null"] },
        category_primary:   { type: ["string", "null"] },
        category_secondary: { type: ["string", "null"] },
      },
      required: ["description", "owner_name", "owed_to_name"],
    },
  },
};

const completion = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "I'll send the redlined LOIA to Riverbend by Friday." }],
  tools: [REGISTER_COMMITMENT_FN],
});

for (const call of completion.choices[0].message.tool_calls ?? []) {
  if (call.function.name === "register_commitment") {
    const args = JSON.parse(call.function.arguments);
    // Same handleRegister() as the Anthropic example — the protocol
    // POST body is identical regardless of which model produced the args.
  }
}
```

### Python

```python
from openai import OpenAI
import json, os, requests

client = OpenAI()

REGISTER_COMMITMENT_FN = {
    "type": "function",
    "function": {
        "name": "register_commitment",
        "description": (
            "Register a commitment the user or agent has made so it becomes a "
            "verifiable, hash-anchored record."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "description":        {"type": "string"},
                "owner_name":         {"type": "string"},
                "owner_company":      {"type": ["string", "null"]},
                "owed_to_name":       {"type": "string"},
                "owed_to_company":    {"type": ["string", "null"]},
                "due_date":           {"type": ["string", "null"]},
                "date_type":          {"type": ["string", "null"]},
                "category_primary":   {"type": ["string", "null"]},
                "category_secondary": {"type": ["string", "null"]},
            },
            "required": ["description", "owner_name", "owed_to_name"],
        },
    },
}

completion = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "I'll send the redlined LOIA to Riverbend by Friday."}],
    tools=[REGISTER_COMMITMENT_FN],
)

for call in completion.choices[0].message.tool_calls or []:
    if call.function.name == "register_commitment":
        args = json.loads(call.function.arguments)
        r = requests.post(
            "https://api.example.com/commitments/register",
            json={"source": "agent", "commitment": args},
            headers={"X-API-Key": os.environ["REDAS_API_KEY"]},
        )
```

---

## Custom HTTP integration

If you're not using the Anthropic or OpenAI SDKs — Mistral, Llama, a local model, your own framework — the integration is one HTTP call. The agent emits a JSON object matching the protocol shape, and you POST it.

```bash
curl -X POST https://api.example.com/commitments/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $REDAS_API_KEY" \
  -d '{
    "source": "agent",
    "commitment": {
      "description": "Send the redlined LOIA to Riverbend",
      "owner_name": "Priya Ramesh",
      "owner_company": "Northbridge Construction",
      "owed_to_name": "Alex Morgan",
      "owed_to_company": "Riverbend Solar Project",
      "due_date": "2026-05-15",
      "date_type": "exact",
      "category_primary": "Schedule"
    }
  }'
```

Response:

```json
{
  "commitment_id": "a3f1e2d4-1234-5678-90ab-cdef12345678",
  "commitment_hash": "e88243c9c42657ef090a05bea7146cb283d31ffd238777264c50485f1b485047",
  "registered_at": "2026-04-15T14:22:10.334Z",
  "status": "auto_confirmed",
  "source": "agent"
}
```

See [`docs/api-format.md`](api-format.md) for the full request/response specification including idempotency, error shapes, and field semantics.

---

## Third-party verification — the trust property

The hash returned at registration is the commitment's **identity**. Anyone — your downstream system, the counterparty, an arbiter, a journalist — can fetch the canonical fields and re-compute the hash locally. If they match, the record is provably the original.

```js
// Downstream system, no Redas credentials, no trust in the registering server.
const verify = await fetch(`https://api.example.com/commitments/verify/${commitmentId}`);
const { commitment_hash, canonical_fields, protocol_version } = await verify.json();

const { generateCommitmentHash } = require("./redas-protocol/src/js/hash");
const recomputed = generateCommitmentHash(canonical_fields);

if (recomputed === commitment_hash) {
  console.log(`Verified — protocol v${protocol_version}.`);
}
```

`GET /commitments/verify/:id` is **public by protocol contract** — no `Authorization` header required, no secrets. That's the property that makes the protocol useful: third parties verify without needing a relationship with the registering service.

For full verification semantics (legacy `v1_legacy_match` reason, malformed hashes, the v2 → v1 fallback path), see [`docs/verification-guide.md`](verification-guide.md).

---

## Pitfalls

**Don't register hallucinations.** An agent making up a commitment to satisfy a user (*"sure, I scheduled the inspection"* when nothing was scheduled) will dutifully register the lie too. The tool description must explicitly say *"only register concrete, deliverable-bearing commitments — not aspirational statements or speculation."* And: pair the registration with a real-world side effect (an actual calendar invite, an actual email send) where you can. The hash proves the agent SAID it; only the side effect proves the agent DID it.

**Idempotency is your friend.** If the same agent re-runs over the same transcript, or a retry-after-timeout fires twice, the protocol returns `status: "idempotent_return"` with the existing commitment instead of creating a duplicate. You don't have to deduplicate client-side. (This is hash-based — same canonical input → same hash → same row.)

**Register early in the loop.** Pre-action registration is more defensible than post-action. If your agent is in a multi-turn conversation, register the commitment as soon as the agent decides to commit, BEFORE the user has a chance to revise or backtrack. The registered version is the one that matters; later edits are amendments, not replacements.

**Don't put PII in `description`.** The verify endpoint is public. The canonical-fields projection is queryable by anyone with the `commitment_id`. If your commitment is *"call John at 555-0199 about his bankruptcy"*, that becomes public. Treat the protocol record as a **public-facing summary** — keep raw private context in your own system, and reference it via `source_reference` (which is metadata, not part of the hash).

**The agent's job is to PRODUCE the canonical fields.** It is not the agent's job to produce the hash itself. The protocol implementation does the canonicalization + SHA-256. If your agent emits a hash directly, something has gone sideways — that's a sign the model is hallucinating cryptography.

---

## Where to go from here

- **[`docs/hash-specification.md`](hash-specification.md)** — the canonicalization rules. Read this if you're porting the protocol to a new language or debugging a hash mismatch.
- **[`docs/api-format.md`](api-format.md)** — the full HTTP wire format for `POST /register` and `GET /verify/:id`.
- **[`docs/verification-guide.md`](verification-guide.md)** — verification semantics including the v1 legacy fallback path.
- **[`docs/schema-reference.md`](schema-reference.md)** — field-by-field breakdown of the commitment object.
- **[`tests/fixtures/commitments.json`](../tests/fixtures/commitments.json)** — 15 reference inputs you can use to sanity-check your integration end-to-end.

If you ship a working integration with a tool-calling LLM that isn't covered here, [open an issue](https://github.com/Redas-Protocol/redas-protocol/issues) — we'll add it to the guide.
