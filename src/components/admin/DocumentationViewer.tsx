import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Copy, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface DocumentationData {
  model_info: {
    api_id: string;
    display_name: string;
    provider: string;
    content_type: string;
    model_family?: string;
    payload_structure: string;
    base_token_cost: number;
    estimated_time_seconds?: number;
  };
  request_structure: {
    base_payload: any;
    parameter_format: string;
    prompt_field: string;
    required_fields: string[];
  };
  common_parameters: Record<string, {
    type: string;
    location: string;
    observed_values: any[];
    frequency: Record<string, number>;
    optional: boolean;
  }>;
  successful_examples: Array<{
    generation_id: string;
    created_at: string;
    prompt: string;
    parameters_sent: any;
    api_payload: any;
    tokens_used: number;
    success: boolean;
  }>;
  parameter_transformations: Array<{
    from: string;
    to: string;
    transformation: string;
  }>;
  provider_specifics: Record<string, any>;
  known_issues: Array<{
    issue: string;
    resolution: string;
    date_identified: string;
  }>;
  debugging_tips: string[];
  statistics: {
    total_analyzed: number;
    avg_processing_time: number | null;
    success_rate: number;
    most_used_parameters: string[];
  };
}

interface Documentation {
  id: string;
  model_record_id: string;
  provider: string;
  model_id: string;
  model_name: string;
  content_type: string;
  documentation_data: DocumentationData;
  analyzed_generations_count: number;
  last_analyzed_at: string;
  documentation_version: number;
}

interface DocumentationViewerProps {
  documentation: Documentation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegenerate: (modelRecordId: string) => void;
  isRegenerating?: boolean;
}

export function DocumentationViewer({
  documentation,
  open,
  onOpenChange,
  onRegenerate,
  isRegenerating = false,
}: DocumentationViewerProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!documentation) return null;

  const { documentation_data: data } = documentation;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">
                {data.model_info.display_name}
              </DialogTitle>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{data.model_info.provider}</Badge>
                <Badge variant="secondary">{data.model_info.content_type}</Badge>
                <Badge>{data.model_info.payload_structure}</Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRegenerate(documentation.model_record_id)}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated {formatDistanceToNow(new Date(documentation.last_analyzed_at))} ago
            {' • '}
            {documentation.analyzed_generations_count} generations analyzed
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="debugging">Debugging</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Model Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">API ID</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {data.model_info.api_id}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(data.model_info.api_id, 'API ID')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Base Token Cost</p>
                    <p className="text-sm text-muted-foreground">
                      {data.model_info.base_token_cost} tokens
                    </p>
                  </div>
                  {data.model_info.model_family && (
                    <div>
                      <p className="text-sm font-medium">Model Family</p>
                      <p className="text-sm text-muted-foreground">
                        {data.model_info.model_family}
                      </p>
                    </div>
                  )}
                  {data.model_info.estimated_time_seconds && (
                    <div>
                      <p className="text-sm font-medium">Estimated Processing Time</p>
                      <p className="text-sm text-muted-foreground">
                        {data.model_info.estimated_time_seconds}s
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Base Payload Format</p>
                  <div className="bg-muted p-3 rounded-lg relative">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(data.request_structure.base_payload, null, 2)}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(data.request_structure.base_payload, null, 2),
                          'Base payload'
                        )
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Prompt Field</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {data.request_structure.prompt_field}
                  </code>
                </div>
                <div>
                  <p className="text-sm font-medium">Required Fields</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {data.request_structure.required_fields.map((field) => (
                      <Badge key={field} variant="outline">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parameters" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Common Parameters</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Usage Count</TableHead>
                      <TableHead>Sample Values</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(data.common_parameters).map(([param, info]) => {
                      const totalUses = Object.values(info.frequency).reduce(
                        (sum, v) => sum + v,
                        0
                      );
                      return (
                        <TableRow key={param}>
                          <TableCell className="font-mono text-sm">{param}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{info.type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {info.location}
                          </TableCell>
                          <TableCell>{totalUses}×</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {info.observed_values.slice(0, 3).map((val, idx) => (
                                <code
                                  key={idx}
                                  className="text-xs bg-muted px-1.5 py-0.5 rounded"
                                >
                                  {JSON.stringify(val)}
                                </code>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {data.parameter_transformations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Parameter Transformations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.parameter_transformations.map((transform, idx) => (
                    <div key={idx} className="border-l-2 border-primary pl-4">
                      <p className="text-sm font-medium">{transform.from}</p>
                      <p className="text-sm text-muted-foreground">→ {transform.to}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {transform.transformation}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="examples" className="space-y-4">
            {data.successful_examples.map((example, idx) => (
              <Card key={example.generation_id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">Example {idx + 1}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(example.created_at))} ago
                      </p>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Success
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Prompt</p>
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      {example.prompt}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">API Payload</p>
                    <div className="bg-muted p-3 rounded-lg relative">
                      <pre className="text-xs overflow-x-auto max-h-64">
                        {JSON.stringify(example.api_payload, null, 2)}
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() =>
                          copyToClipboard(
                            JSON.stringify(example.api_payload, null, 2),
                            'Payload'
                          )
                        }
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Tokens Used: {example.tokens_used}</span>
                    <span>ID: {example.generation_id.slice(0, 8)}...</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="debugging" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Debugging Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.debugging_tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <span className="text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {data.known_issues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Known Issues</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.known_issues.map((issue, idx) => (
                    <div key={idx} className="border-l-2 border-destructive pl-4">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <p className="text-sm font-medium">{issue.issue}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Resolution: {issue.resolution}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Identified: {issue.date_identified}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Provider-Specific Details</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(data.provider_specifics).map(([provider, details]) => (
                  <div key={provider} className="space-y-2">
                    <p className="text-sm font-medium">{provider}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(details as Record<string, any>).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground">{key}: </span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total Analyzed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{data.statistics.total_analyzed}</p>
                  <p className="text-sm text-muted-foreground">generations</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{data.statistics.success_rate}%</p>
                  <p className="text-sm text-muted-foreground">of analyzed generations</p>
                </CardContent>
              </Card>

              {data.statistics.avg_processing_time && (
                <Card>
                  <CardHeader>
                    <CardTitle>Avg Processing Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {data.statistics.avg_processing_time}s
                    </p>
                    <p className="text-sm text-muted-foreground">per generation</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Most Used Parameters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {data.statistics.most_used_parameters.map((param) => (
                      <Badge key={param} variant="secondary">
                        {param}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
