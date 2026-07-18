#!/bin/bash
# =============================================================================
# Namespace Replacement Script (PIPE-6072)
# =============================================================================
# Performs namespace token replacements across Salesforce source files.
# Designed to be reusable across multiple packages.
#
# Usage:
#   ./scripts/namespace-replace.sh [config_file]
#
# Config file defaults to: scripts/namespace-config.json
# =============================================================================

set -euo pipefail

CONFIG_FILE="${1:-scripts/namespace-config.json}"
SOURCE_DIR="force-app"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Warning: Namespace config file not found at $CONFIG_FILE"
  echo "Skipping namespace replacement. Create the config to enable this step."
  exit 0
fi

echo "=== Namespace Replacement ==="
echo "Config: $CONFIG_FILE"
echo "Source: $SOURCE_DIR"
echo ""

REPLACEMENT_COUNT=$(jq '.replacements | length' "$CONFIG_FILE")

if [ "$REPLACEMENT_COUNT" -eq 0 ]; then
  echo "No replacements configured. Skipping."
  exit 0
fi

TOTAL_FILES_MODIFIED=0

for i in $(seq 0 $((REPLACEMENT_COUNT - 1))); do
  PATTERN=$(jq -r ".replacements[$i].pattern" "$CONFIG_FILE")
  REPLACEMENT=$(jq -r ".replacements[$i].replacement" "$CONFIG_FILE")
  FILE_EXTENSIONS=$(jq -r ".replacements[$i].extensions // \"cls,trigger,xml,js,html,cmp,page\" " "$CONFIG_FILE")
  DESCRIPTION=$(jq -r ".replacements[$i].description // \"Replacement $i\"" "$CONFIG_FILE")

  echo "[$((i + 1))/$REPLACEMENT_COUNT] $DESCRIPTION"
  echo "  Pattern:     $PATTERN"
  echo "  Replacement: $REPLACEMENT"
  echo "  Extensions:  $FILE_EXTENSIONS"

  FIND_ARGS=""
  IFS=',' read -ra EXTS <<< "$FILE_EXTENSIONS"
  for idx in "${!EXTS[@]}"; do
    ext="${EXTS[$idx]}"
    if [ "$idx" -eq 0 ]; then
      FIND_ARGS="-name \"*.${ext}\""
    else
      FIND_ARGS="$FIND_ARGS -o -name \"*.${ext}\""
    fi
  done

  FILES_MODIFIED=$(eval "find $SOURCE_DIR \( $FIND_ARGS \) -type f" | xargs grep -rl "$PATTERN" 2>/dev/null | wc -l | tr -d ' ')
  eval "find $SOURCE_DIR \( $FIND_ARGS \) -type f" | xargs grep -rl "$PATTERN" 2>/dev/null | while read -r file; do
    sed -i "s|${PATTERN}|${REPLACEMENT}|g" "$file"
  done

  echo "  Files modified: $FILES_MODIFIED"
  TOTAL_FILES_MODIFIED=$((TOTAL_FILES_MODIFIED + FILES_MODIFIED))
  echo ""
done

echo "=== Namespace Replacement Complete ==="
echo "Total files modified: $TOTAL_FILES_MODIFIED"
