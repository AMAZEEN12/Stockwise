#!/usr/bin/env bash
# Gate "Contract change" (release.md): a change to contract/openapi.yaml must come with a change
# to decisions.md (the dated, two-engineer line in section 3). Usage: check-contract-log.sh <base-ref>
set -euo pipefail
BASE="${1:?base ref}"
changed() { git diff --name-only "$BASE"...HEAD -- "$1" | grep -q .; }
if changed contract/openapi.yaml && ! changed decisions.md; then
  echo "::error file=contract/openapi.yaml::The contract changed but decisions.md section 3 has no new dated line naming two engineers."; exit 1
fi
echo "contract-log: OK"
