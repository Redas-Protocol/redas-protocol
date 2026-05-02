"""Conformance test - Python side.

Runs the Python hash.py reference against tests/fixtures/commitments.json
and asserts each output matches tests/expected-hashes.json.

The expected-hashes.json file is generated from the JavaScript reference
implementation. A correct Python port MUST produce byte-identical output
for every fixture. If any fixture diverges, the Python implementation
has drifted from the spec and needs to be fixed.

Usage:
    python tests/conformance.py           # run tests (exit 0 on pass)
    python tests/conformance.py --update  # regenerate expected-hashes.json
                                          #   (only run this if you've
                                          #   intentionally changed the
                                          #   spec — not to paper over
                                          #   a failing test)
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), os.pardir, "src", "python"))

from hash import generate_commitment_hash  # noqa: E402

FIXTURES_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "commitments.json")
EXPECTED_PATH = os.path.join(os.path.dirname(__file__), "expected-hashes.json")


def main():
    with open(FIXTURES_PATH, "r", encoding="utf-8") as f:
        fixtures = json.load(f)

    # Fixtures with `version: 1` exercise the legacy v1 canonicalization
    # (used by verify_commitment's fallback path for pre-2026-04-26 rows).
    # Fixtures without a `version` field default to PROTOCOL_VERSION.
    computed = {
        f["name"]: generate_commitment_hash(f["input"], version=f.get("version"))
        for f in fixtures
    }

    if "--update" in sys.argv:
        with open(EXPECTED_PATH, "w", encoding="utf-8") as f:
            json.dump(computed, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"Wrote {len(computed)} expected hashes to {EXPECTED_PATH}")
        return 0

    if not os.path.exists(EXPECTED_PATH):
        print(
            f"ERROR: {EXPECTED_PATH} does not exist. "
            f"Generate it from the JS reference: node tests/conformance.js --update",
            file=sys.stderr,
        )
        return 2

    with open(EXPECTED_PATH, "r", encoding="utf-8") as f:
        expected = json.load(f)

    passed = 0
    failed = 0

    for fixture in fixtures:
        name = fixture["name"]
        got = computed[name]
        want = expected.get(name)

        if want is None:
            print(f"FAIL {name}: no expected hash in {EXPECTED_PATH}", file=sys.stderr)
            failed += 1
            continue

        if got != want:
            print(f"FAIL {name}", file=sys.stderr)
            print(f"  expected: {want}", file=sys.stderr)
            print(f"  got:      {got}", file=sys.stderr)
            failed += 1
            continue

        sibling_name = fixture.get("expected_hash_same_as")
        if sibling_name:
            sibling = computed[sibling_name]
            if got != sibling:
                print(f"FAIL {name}: expected to match '{sibling_name}'", file=sys.stderr)
                print(f"  got:      {got}", file=sys.stderr)
                print(f"  sibling:  {sibling}", file=sys.stderr)
                failed += 1
                continue

        print(f"PASS {name}")
        passed += 1

    print()
    print(f"{passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
