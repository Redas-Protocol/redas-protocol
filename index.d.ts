/**
 * redas-protocol — TypeScript types.
 *
 * The reference implementation is plain JavaScript with no compile
 * step; these types exist only for downstream TypeScript consumers.
 *
 * Apache 2.0 License — see LICENSE at repo root.
 */

/**
 * The current protocol version. New registrations always use the
 * current version; verifyCommitment falls back to v1 for legacy
 * commitments registered before the upgrade. See
 * docs/hash-specification.md § Protocol versioning.
 */
export const PROTOCOL_VERSION: 2;

/**
 * The nine fields that participate in the canonical hash, in
 * alphabetical order (which is also the JSON serialization order).
 * Any other fields on the commitment object are ignored by the hash
 * function.
 */
export const CANONICAL_FIELDS: readonly [
  'category_primary',
  'category_secondary',
  'date_type',
  'description',
  'due_date',
  'owed_to_company',
  'owed_to_name',
  'owner_company',
  'owner_name'
];

/** Input shape for a commitment. Fields outside this list are ignored by the hash. */
export interface Commitment {
  description: string;
  owner_name: string;
  owed_to_name: string;
  owner_company?: string | null;
  owed_to_company?: string | null;
  due_date?: string | null;
  date_type?: 'exact' | 'range' | 'asap' | 'day_of_week' | 'relative' | null;
  category_primary?: 'Financial' | 'Schedule' | 'Scope' | 'Resource' | 'Other' | string | null;
  category_secondary?: string | null;
  [extra: string]: unknown;
}

/** Canonical form returned by `canonicalize` — the exact object that gets serialized to JSON before hashing. */
export interface CanonicalCommitment {
  category_primary: string | null;
  category_secondary: string | null;
  date_type: string | null;
  description: string | null;
  due_date: string | null;
  owed_to_company: string | null;
  owed_to_name: string | null;
  owner_company: string | null;
  owner_name: string | null;
}

export interface HashOptions {
  /** Force a specific protocol version. Defaults to PROTOCOL_VERSION. Pass `1` to compute a legacy hash. */
  version?: 1 | 2;
}

/** Build the canonical form used for hashing. Does not hash; just normalizes. */
export function canonicalize(commitment: Commitment, version?: 1 | 2): CanonicalCommitment;

/** Generate the SHA-256 hash of a commitment. Returns a 64-char lowercase hex string. */
export function generateCommitmentHash(commitment: Commitment, options?: HashOptions): string;

export type VerifyReason =
  | 'match'
  | 'v1_legacy_match'
  | 'mismatch'
  | 'legacy_null_hash'
  | 'malformed_hash';

export interface VerifyResult {
  valid: boolean;
  expected_hash: string | null;
  stored_hash: string | null;
  reason: VerifyReason;
  /** Which canonicalization version produced the matching hash. `null` when no match. */
  protocol_version: 1 | 2 | null;
}

/**
 * Verify a commitment against a stored hash. Tries v2 first, then
 * falls back to v1 for pre-2026-04-26 legacy commitments. Pure
 * function — no network, no state.
 */
export function verifyCommitment(commitment: Commitment, storedHash: string | null | undefined): VerifyResult;
