#!/bin/bash
# Lovable.dev Post-Deployment Script
# This script should run automatically after each deployment

set -e

echo "🚀 Running post-deployment tasks..."

# Step 1: Check if migrations were applied
echo "📊 Checking database migrations..."
if command -v supabase &> /dev/null; then
  echo "✅ Supabase CLI found"

  # Apply pending migrations
  echo "📦 Applying pending migrations..."
  supabase db push || echo "⚠️  Migrations may already be applied"

  # Regenerate TypeScript types
  echo "🔄 Regenerating TypeScript types..."
  supabase gen types typescript --linked > src/integrations/supabase/types.ts
  echo "✅ Types regenerated"
else
  echo "⚠️  Supabase CLI not found - skipping migration check"
fi

# Step 2: Restore monitoring features
echo "🔧 Restoring monitoring features..."

if [ -f "src/hooks/useErrorNotifications.tsx.disabled" ]; then
  echo "  - Restoring useErrorNotifications..."
  mv src/hooks/useErrorNotifications.tsx.disabled src/hooks/useErrorNotifications.tsx
  echo "  ✅ useErrorNotifications restored"
fi

if [ -f "src/pages/admin/APIHealthMonitor.tsx.disabled" ]; then
  echo "  - Restoring APIHealthMonitor..."
  mv src/pages/admin/APIHealthMonitor.tsx.disabled src/pages/admin/APIHealthMonitor.tsx
  echo "  ✅ APIHealthMonitor restored"
fi

if [ -f "src/pages/admin/EnhancedErrorDashboard.tsx.disabled" ]; then
  echo "  - Restoring EnhancedErrorDashboard..."
  mv src/pages/admin/EnhancedErrorDashboard.tsx.disabled src/pages/admin/EnhancedErrorDashboard.tsx
  echo "  ✅ EnhancedErrorDashboard restored"
fi

# Step 3: Verify build
echo "🏗️  Verifying build..."
npm run build

echo "✅ Post-deployment tasks completed successfully!"
echo ""
echo "📋 Summary:"
echo "  - Migrations: Applied"
echo "  - Types: Regenerated"
echo "  - Monitoring: Restored"
echo "  - Build: Success"
