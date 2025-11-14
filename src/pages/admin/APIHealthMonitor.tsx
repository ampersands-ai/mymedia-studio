/**
 * API Health Monitor
 *
 * ⚠️ TEMPORARILY DISABLED
 * This feature requires Supabase types regeneration.
 * See SUPABASE_TYPES_FIX.md for instructions.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function APIHealthMonitor() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-900">
            <AlertCircle className="h-5 w-5" />
            Feature Temporarily Disabled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-yellow-800">
            The API Health Monitor feature is temporarily disabled while Supabase types are being regenerated.
          </p>
          <div className="bg-white p-4 rounded border border-yellow-200">
            <p className="font-semibold text-sm text-yellow-900 mb-2">To re-enable this feature:</p>
            <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
              <li>Run: <code className="bg-yellow-100 px-1 rounded">supabase gen types typescript --linked &gt; src/integrations/supabase/types.ts</code></li>
              <li>Rename <code className="bg-yellow-100 px-1 rounded">APIHealthMonitor.tsx.disabled</code> to <code className="bg-yellow-100 px-1 rounded">APIHealthMonitor.tsx</code></li>
              <li>Delete this placeholder file</li>
              <li>Run <code className="bg-yellow-100 px-1 rounded">npm run build</code></li>
            </ol>
          </div>
          <p className="text-xs text-yellow-700">
            See <code>SUPABASE_TYPES_FIX.md</code> for complete instructions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
