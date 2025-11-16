import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ErrorBreakdown } from "@/hooks/admin/useWebhookAnalytics";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface Props {
  errors: ErrorBreakdown[];
}

export const WebhookErrorAnalysisPanel = ({ errors }: Props) => {
  // Prepare data for chart - top 10 errors
  const chartData = errors.slice(0, 10).map(error => ({
    name: `${error.provider}: ${error.errorCode}`,
    count: error.errorCount
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Analysis</CardTitle>
        <CardDescription>
          Top errors by provider and error code
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bar Chart */}
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No errors in selected time range
          </div>
        )}

        {/* Error Details Accordion */}
        {errors.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Error Details</h4>
            <Accordion type="single" collapsible className="w-full">
              {errors.map((error, index) => (
                <AccordionItem key={index} value={`error-${index}`}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-2 text-left">
                      <Badge variant="destructive">{error.errorCount}</Badge>
                      <span className="capitalize">{error.provider}</span>
                      <span className="text-muted-foreground">-</span>
                      <code className="text-xs">{error.errorCode}</code>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pl-4">
                      <p className="text-sm font-medium">Sample Error Messages:</p>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        {error.errorMessages.length > 0 ? (
                          error.errorMessages.map((msg, idx) => (
                            <li key={idx} className="break-words">
                              • {msg}
                            </li>
                          ))
                        ) : (
                          <li>No error messages available</li>
                        )}
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
