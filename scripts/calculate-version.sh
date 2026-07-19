#!/bin/bash
# =============================================================================
# Package Version Calculation Script (PIPE-6073)
# =============================================================================
# Calculates the next package version number based on existing released versions.
#
# Version format: Major.Minor.Patch.Build
# - Minor is auto-incremented from the latest released version
# - Patch is always 0 (patch versioning requires Salesforce support enablement)
# - Build uses NEXT to auto-increment
#
# Usage:
#   ./scripts/calculate-version.sh <package_id> <devhub_username>
#
# Output: Version number string (e.g., "1.1.0.NEXT")
# =============================================================================

set -euo pipefail

PACKAGE_ID="${1:?Package ID is required}"
DEVHUB_USERNAME="${2:?DevHub username is required}"

echo "=== Package Version Calculation ===" >&2
echo "Package ID: $PACKAGE_ID" >&2
echo "DevHub: $DEVHUB_USERNAME" >&2

releaseListJSON=$(sf package version list \
  --packages "$PACKAGE_ID" \
  --target-dev-hub "$DEVHUB_USERNAME" \
  --released \
  --order-by CreatedDate \
  --json 2>/dev/null)

latestVersion=$(echo "$releaseListJSON" | jq -r '.result[-1].Version // empty')

if [ -z "$latestVersion" ]; then
  echo "No existing released versions found. Starting from 1.0.0.NEXT" >&2
  echo "1.0.0.NEXT"
  exit 0
fi

echo "Latest Released Version: $latestVersion" >&2

MAJOR=$(echo "$latestVersion" | jq -rR 'split(".")[0]')
MINOR=$(echo "$latestVersion" | jq -rR 'split(".")[1]')

NEXT_MINOR=$((MINOR + 1))
newVersion="${MAJOR}.${NEXT_MINOR}.0.NEXT"

echo "Next Version: $newVersion" >&2
echo "$newVersion"
