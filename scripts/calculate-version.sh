#!/bin/bash
# =============================================================================
# Package Version Calculation Script (PIPE-6073)
# =============================================================================
# Calculates the next package version number based on existing released versions.
#
# Version format: Major.Minor.Patch.Build
# - Patch encodes the date (MMDD)
# - Build increments for same-day builds
#
# Usage:
#   ./scripts/calculate-version.sh <package_id> <devhub_username>
#
# Output: Version number string (e.g., "25.11.0711.1")
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

packageVersionListResultArrayLastItemVersion=$(echo "$releaseListJSON" | jq -r '.result[-1].Version // empty')
latestVersionReleaseState=$(echo "$releaseListJSON" | jq -r '.result[-1].ReleaseState // empty')

if [ -z "$packageVersionListResultArrayLastItemVersion" ]; then
  echo "No existing versions found. Starting from 1.0.0.0" >&2
  todayYYMM="$(date +%y)$(date +%m)"
  todayDay="$(date +%-d)"
  echo "1.0.${todayYYMM}${todayDay}.1"
  exit 0
fi

echo "Latest Version: $packageVersionListResultArrayLastItemVersion" >&2
echo "Latest Release State: $latestVersionReleaseState" >&2

latestMajorAndMinorVersion=$(
  echo "$packageVersionListResultArrayLastItemVersion" \
    | jq -rR 'split(".")[0:2] | join(".")'
)

majorMinor="${latestMajorAndMinorVersion}"
patch="${packageVersionListResultArrayLastItemVersion}" 
patch=$(echo "$patch" | jq -rR 'split(".")[2]')

todayYYMM="$(date +%y)$(date +%m)"
todayDay="$(date +%-d)"

dayPart="${patch%??}"
buildPart="${patch: -2}"

# Construct today's expected patch prefix
todayPatchPrefix="${todayYYMM}${todayDay}"

if [ "$dayPart" == "$todayPatchPrefix" ] || [ "$patch" == "${todayPatchPrefix}${buildPart}" ]; then
  newBuild=$(printf "%02d" $((10#$buildPart + 1)))
  newVersion="${majorMinor}.${todayPatchPrefix}${newBuild}"
else
  newVersion="${majorMinor}.${todayPatchPrefix}01"
fi

echo "Calculated Version: $newVersion" >&2
echo "$newVersion"
