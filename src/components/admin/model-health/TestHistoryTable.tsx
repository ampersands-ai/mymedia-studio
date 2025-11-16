import { Card } from "@/components/ui/card";

export const TestHistoryTable = () => {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Recent Test Results</h3>
      </div>

      <div className="text-center py-8 text-muted-foreground">
        Test history is currently unavailable. Please use individual model tests to validate functionality.
      </div>
    </Card>
  );
};