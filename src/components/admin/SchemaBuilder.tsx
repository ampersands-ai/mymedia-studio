import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ParameterDialog } from "./ParameterDialog";
import { parseSchema, generateSchema, type Parameter } from "@/lib/schema-utils";

interface SchemaBuilderProps {
  schema: Record<string, any>;
  onChange: (schema: Record<string, any>) => void;
}

export function SchemaBuilder({ schema, onChange }: SchemaBuilderProps) {
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [editingParameter, setEditingParameter] = useState<Parameter | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    try {
      const parsed = parseSchema(schema);
      setParameters(parsed);
    } catch (error) {
      console.error('Failed to parse schema:', error);
      setParameters([]);
    }
  }, [schema]);

  const handleAddParameter = () => {
    setEditingParameter(null);
    setDialogOpen(true);
  };

  const handleEditParameter = (param: Parameter) => {
    setEditingParameter(param);
    setDialogOpen(true);
  };

  const handleDeleteParameter = (paramName: string) => {
    const updated = parameters.filter(p => p.name !== paramName);
    setParameters(updated);
    onChange(generateSchema(updated));
  };

  const handleSaveParameter = (param: Parameter) => {
    let updated: Parameter[];
    
    if (editingParameter) {
      updated = parameters.map(p => 
        p.name === editingParameter.name ? param : p
      );
    } else {
      updated = [...parameters, param];
    }
    
    setParameters(updated);
    onChange(generateSchema(updated));
    setDialogOpen(false);
  };

  const generatedJson = JSON.stringify(generateSchema(parameters), null, 2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {parameters.length} parameter{parameters.length !== 1 ? 's' : ''} defined
        </p>
        <Button type="button" onClick={handleAddParameter} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Parameter
        </Button>
      </div>

      <div className="space-y-2">
        {parameters.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No parameters defined. Click "Add Parameter" to get started.
          </Card>
        ) : (
          parameters.map((param) => (
            <Card key={param.name} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold">{param.name}</span>
                    <Badge variant="outline">{param.type}</Badge>
                    {param.required && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                  </div>
                  
                  {param.description && (
                    <p className="text-sm text-muted-foreground">{param.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-xs">
                    {param.enum && (
                      <div>
                        <span className="text-muted-foreground">Options: </span>
                        <code className="bg-muted px-1.5 py-0.5 rounded">
                          {param.enum.join(', ')}
                        </code>
                      </div>
                    )}
                    
                    {param.default !== undefined && param.default !== null && param.default !== '' && (
                      <div>
                        <span className="text-muted-foreground">Default: </span>
                        <code className="bg-muted px-1.5 py-0.5 rounded">
                          {JSON.stringify(param.default)}
                        </code>
                      </div>
                    )}
                    
                    {param.type === 'array' && param.items && (
                      <div>
                        <span className="text-muted-foreground">Array of: </span>
                        <code className="bg-muted px-1.5 py-0.5 rounded">
                          {param.items.type}
                        </code>
                      </div>
                    )}
                    
                    {(param.minimum !== undefined || param.maximum !== undefined) && (
                      <div>
                        <span className="text-muted-foreground">Range: </span>
                        <code className="bg-muted px-1.5 py-0.5 rounded">
                          {param.minimum ?? '∞'} to {param.maximum ?? '∞'}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-1 ml-4">
                  <Button 
                    type="button"
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleEditParameter(param)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    type="button"
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleDeleteParameter(param.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Collapsible open={showJson} onOpenChange={setShowJson}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full">
            {showJson ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
            {showJson ? 'Hide' : 'Show'} Generated JSON
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
            {generatedJson}
          </pre>
        </CollapsibleContent>
      </Collapsible>

      <ParameterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        parameter={editingParameter}
        existingNames={parameters.map(p => p.name).filter(n => n !== editingParameter?.name)}
        onSave={handleSaveParameter}
      />
    </div>
  );
}
