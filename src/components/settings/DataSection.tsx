import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Trash2 } from "lucide-react";
import { clearAllCaches } from "@/utils/cacheManagement";
import { toast } from "sonner";

export function DataSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Settings</CardTitle>
        <CardDescription>Developer tools and cache management</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">Clear All Caches</h4>
              <p className="text-xs text-muted-foreground mb-3">
                This will clear all cached data, unregister service workers, and reload the page.
                Use this if you're experiencing issues with outdated content.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  try {
                    await clearAllCaches();
                  } catch {
                    toast.error("Failed to clear caches");
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Caches
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
