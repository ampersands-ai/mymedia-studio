import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * DEPRECATED: Model health widget disabled
 * Feature has been removed as part of registry migration
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
            Model health monitoring is currently unavailable. Model metadata has been migrated to a file-based registry system.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
