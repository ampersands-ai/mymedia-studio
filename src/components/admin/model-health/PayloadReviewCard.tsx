import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Eye, Copy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PayloadReviewCardProps {
  payload: any;
  onPayloadChange: (newPayload: any) => void;
  editable: boolean;
  onToggleEdit: () => void;
}

export const PayloadReviewCard = ({ 
  payload, 
  onPayloadChange, 
  editable, 
  onToggleEdit 
}: PayloadReviewCardProps) => {
  const [editedPayload, setEditedPayload] = useState(JSON.stringify(payload, null, 2));
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(editedPayload);
    setCopied(true);
    toast.success("Payload copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    try {
      const parsed = JSON.parse(editedPayload);
      onPayloadChange(parsed);
      setValidationError(null);
      toast.success("Payload updated successfully");
    } catch (e) {
      const error = e instanceof Error ? e.message : "Invalid JSON";
      setValidationError(error);
      toast.error("Invalid JSON format");
    }
  };

  const handlePayloadChange = (value: string) => {
    setEditedPayload(value);
    setValidationError(null);
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Badge variant={editable ? "default" : "outline"}>
                {editable ? "Editing" : "Preview"}
              </Badge>
              Final API Payload
            </CardTitle>
            <CardDescription>
              Review and optionally edit the exact payload that will be sent to the provider
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              variant={editable ? "default" : "outline"}
              size="sm"
              onClick={onToggleEdit}
            >
              {editable ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
              {editable ? "View Mode" : "Edit Live"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}
        
        {editable ? (
          <div className="space-y-2">
            <Textarea
              value={editedPayload}
              onChange={(e) => handlePayloadChange(e.target.value)}
              className="font-mono text-xs h-96 resize-y"
              placeholder="Edit JSON payload..."
            />
            <Button onClick={handleSaveEdit} className="w-full">
              Apply Changes
            </Button>
          </div>
        ) : (
          <pre className="bg-muted p-4 rounded-md overflow-auto max-h-96 text-xs">
            <code>{editedPayload}</code>
          </pre>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Endpoint:</strong> {payload.endpoint || "N/A"}</p>
          <p><strong>Method:</strong> {payload.method || "POST"}</p>
          <p><strong>Provider:</strong> {payload.provider || "N/A"}</p>
        </div>
      </CardContent>
    </Card>
  );
};
