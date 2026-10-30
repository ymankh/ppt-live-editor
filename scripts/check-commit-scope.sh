#!/usr/bin/env sh
# Rejects commits that change both frontend/ and backend/.
#
#   scripts/check-commit-scope.sh --staged          # the commit being created (pre-commit hook)
#   scripts/check-commit-scope.sh <revision-range>  # every non-merge commit in a range (CI), e.g. main..HEAD
#
# Other paths (apphost/, docs, root config, CI) may be committed with either side.
# Renames are split into delete + add, so moving a file between the two sides also counts as mixing.
set -eu

mixes_sides() {
  awk '/^frontend\//{ f = 1 } /^backend\//{ b = 1 } END { exit !(f && b) }'
}

explain() {
  echo "  Commit frontend/ and backend/ changes separately, e.g.:" >&2
  echo "    git restore --staged frontend   # then commit backend, then stage and commit frontend" >&2
}

if [ "${1:-}" = "--staged" ]; then
  if git diff --cached --name-only --no-renames | mixes_sides; then
    echo "✖ This commit mixes frontend/ and backend/ changes." >&2
    explain
    exit 1
  fi
  exit 0
fi

range="${1:?usage: check-commit-scope.sh --staged | <revision-range>}"
failed=0
for commit in $(git rev-list --no-merges "$range"); do
  if git diff-tree --no-commit-id --name-only -r --no-renames "$commit" | mixes_sides; then
    echo "✖ $(git log -1 --format='%h %s' "$commit") — mixes frontend/ and backend/ changes." >&2
    failed=1
  fi
done
if [ "$failed" -ne 0 ]; then
  explain
  exit 1
fi
echo "✔ No commit in $range mixes frontend/ and backend/ changes."
