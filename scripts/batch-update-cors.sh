#!/bin/bash

# Batch CORS Update Script - Updates all edge functions with secure CORS
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔧 Starting batch CORS update for all edge functions..."
echo ""

# Get list of all functions that DON'T have secure CORS yet
FUNCTIONS_TO_UPDATE=$(comm -23 \
  <(find supabase/functions -maxdepth 2 -name "index.ts" -type f | grep -v "_shared" | grep -v "/providers/" | sort) \
  <(grep -l "from.*_shared/cors" supabase/functions/*/index.ts supabase/functions/*/index.ts 2>/dev/null | sort))

# Also check webhooks subdirectory
WEBHOOK_FUNCTIONS=$(find supabase/functions/webhooks -name "index.ts" -type f 2>/dev/null || true)
if [ -n "$WEBHOOK_FUNCTIONS" ]; then
  for func in $WEBHOOK_FUNCTIONS; do
    if ! grep -q "from.*_shared/cors" "$func" 2>/dev/null; then
      FUNCTIONS_TO_UPDATE="$FUNCTIONS_TO_UPDATE
$func"
    fi
  done
fi

TOTAL=$(echo "$FUNCTIONS_TO_UPDATE" | grep -c "index.ts" || echo "0")
UPDATED=0
SKIPPED=0
FAILED=0

echo "Found $TOTAL functions to update"
echo ""

for FILE in $FUNCTIONS_TO_UPDATE; do
  FUNC_NAME=$(dirname "$FILE" | xargs basename)

  # Skip if file doesn't exist
  if [ ! -f "$FILE" ]; then
    echo -e "${YELLOW}⚠  Skipping $FUNC_NAME (file not found)${NC}"
    ((SKIPPED++))
    continue
  fi

  # Skip if already has secure CORS
  if grep -q "getResponseHeaders" "$FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ $FUNC_NAME (already updated)${NC}"
    ((SKIPPED++))
    continue
  fi

  echo "📝 Updating $FUNC_NAME..."

  # Create backup
  cp "$FILE" "$FILE.bak"

  # Check if file has old corsHeaders definition
  if ! grep -q "corsHeaders.*=.*{" "$FILE" 2>/dev/null; then
    echo -e "${YELLOW}⚠  $FUNC_NAME: No corsHeaders found, may need manual review${NC}"
    rm "$FILE.bak"
    ((SKIPPED++))
    continue
  fi

  # Create temporary file for edits
  TMP_FILE="${FILE}.tmp"
  cp "$FILE" "$TMP_FILE"

  # Step 1: Add CORS import after other imports (before first blank line or const)
  # Find last import line and add after it
  awk '
    BEGIN { import_added = 0 }
    /^import.*from/ {
      last_import = NR
    }
    {
      print
      if (last_import > 0 && NR == last_import && import_added == 0) {
        print "import { getResponseHeaders, handleCorsPreflight } from \"../_shared/cors.ts\";"
        import_added = 1
      }
    }
  ' "$TMP_FILE" > "${TMP_FILE}.2" && mv "${TMP_FILE}.2" "$TMP_FILE"

  # Step 2: Remove old corsHeaders definition
  sed -i '/^const corsHeaders = {$/,/^};$/d' "$TMP_FILE"

  # Step 3: Add responseHeaders after Deno.serve
  sed -i '/Deno\.serve(async (req) => {/a\  const responseHeaders = getResponseHeaders(req);' "$TMP_FILE"

  # Step 4: Replace OPTIONS handler
  sed -i "s/if (req\.method === ['\"]OPTIONS['\"].*{/if (req.method === 'OPTIONS') {/" "$TMP_FILE"
  sed -i "/if (req\.method === 'OPTIONS') {/{N;s/\n.*return new Response.*/\n    return handleCorsPreflight(req);/}" "$TMP_FILE"

  # Step 5: Replace all corsHeaders with responseHeaders
  sed -i 's/corsHeaders/responseHeaders/g' "$TMP_FILE"

  # Verify the changes look reasonable
  if grep -q "getResponseHeaders" "$TMP_FILE" && grep -q "handleCorsPreflight" "$TMP_FILE"; then
    mv "$TMP_FILE" "$FILE"
    rm "$FILE.bak"
    echo -e "${GREEN}  ✅ Successfully updated${NC}"
    ((UPDATED++))
  else
    echo -e "${RED}  ❌ Update verification failed, reverting${NC}"
    mv "$FILE.bak" "$FILE"
    rm "$TMP_FILE" 2>/dev/null || true
    ((FAILED++))
  fi

  echo ""
done

echo "============================================"
echo -e "${GREEN}✅ Updated: $UPDATED functions${NC}"
if [ $SKIPPED -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Skipped: $SKIPPED functions${NC}"
fi
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ Failed: $FAILED functions${NC}"
fi
echo "============================================"
echo ""

if [ $UPDATED -gt 0 ]; then
  echo "Next steps:"
  echo "1. Review changes: git diff supabase/functions"
  echo "2. Test critical functions"
  echo "3. Commit: git add . && git commit -m 'SECURITY: Update all edge functions with secure CORS'"
fi
