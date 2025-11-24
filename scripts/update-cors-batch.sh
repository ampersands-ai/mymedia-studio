#!/bin/bash

# Batch CORS Update Script for Edge Functions
# Updates edge functions to use secure CORS configuration

set -e

echo "🔧 Starting batch CORS update for edge functions..."

FUNCTIONS=(
  "generate-storyboard"
  "cancel-generation"
  "generate-content-sync"
  "cancel-render"
  "enhance-prompt"
  "get-voices"
  "generate-caption"
  "delete-storyboard"
  "generate-blog-post"
  "deduct-tokens"
)

UPDATED=0
SKIPPED=0

for func in "${FUNCTIONS[@]}"; do
  FILE="supabase/functions/$func/index.ts"

  if [ ! -f "$FILE" ]; then
    echo "⚠️  Skipping $func (file not found)"
    ((SKIPPED++))
    continue
  fi

  # Check if already updated
  if grep -q "getResponseHeaders" "$FILE"; then
    echo "✓ $func (already updated)"
    ((SKIPPED++))
    continue
  fi

  echo "📝 Updating $func..."

  # Backup
  cp "$FILE" "$FILE.bak"

  # Add import at the top (after other imports)
  sed -i '/^import.*from.*$/a\import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";' "$FILE" | head -1

  # Remove old corsHeaders definition
  sed -i '/^const corsHeaders = {$/,/^};$/d' "$FILE"

  # Update OPTIONS handler
  sed -i 's/if (req.method === .OPTIONS.) {$/if (req.method === '\''OPTIONS'\'') {\n  return handleCorsPreflight(req);\n}/' "$FILE"

  # Add responseHeaders at function start
  sed -i '/Deno.serve(async (req) => {/a\  const responseHeaders = getResponseHeaders(req);' "$FILE"

  # Replace corsHeaders with responseHeaders
  sed -i 's/corsHeaders/responseHeaders/g' "$FILE"

  ((UPDATED++))
done

echo ""
echo "============================================"
echo "✅ Updated: $UPDATED functions"
echo "⚠️  Skipped: $SKIPPED functions"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff"
echo "2. Test functions manually"
echo "3. Commit: git add . && git commit -m 'Update edge functions with secure CORS'"
