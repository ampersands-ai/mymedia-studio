import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * DEPRECATED: Model health widget disabled
 * Depends on ai_models table which has been removed
 */
export const ModelHealthWidget = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Health Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Model health monitoring is currently unavailable. The ai_models table has been migrated to a file-based system.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
