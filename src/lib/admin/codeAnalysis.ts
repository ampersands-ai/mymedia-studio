/**
 * Utility functions for loading and analyzing model source code
 */

import { getModel } from "@/lib/models/registry";

/**
 * Load source code for a model file
 * In production, this would fetch from the actual file system or API
 * For now, we'll extract it from the model module
 */
export async function loadModelSourceCode(
  modelRecordId: string
): Promise<string> {
  try {
    const model = getModel(modelRecordId);

    // In a real implementation, we would fetch the actual .ts file content
    // For now, we'll generate a representation from the module
    const sourceCode = `/** ${model.MODEL_CONFIG.modelName} - ${model.MODEL_CONFIG.provider} */

export const MODEL_CONFIG = ${JSON.stringify(model.MODEL_CONFIG, null, 2)};

export const SCHEMA = ${JSON.stringify(model.SCHEMA, null, 2)};

${typeof model.validate === 'function' ? `export function validate(inputs: Record<string, any>) {
  // Validation logic
  return { valid: true };
}` : ''}

${typeof model.calculateCost === 'function' ? `export function calculateCost(inputs: Record<string, any>): number {
  return ${model.MODEL_CONFIG.baseCreditCost};
}` : ''}

${typeof model.preparePayload === 'function' ? `export function preparePayload(inputs: Record<string, any>) {
  // Payload preparation logic
  return inputs;
}` : ''}

${typeof model.execute === 'function' ? `export async function execute(params: ExecuteGenerationParams): Promise<string> {
  // Model execution logic
  return generationId;
}` : ''}
`;

    return sourceCode;
  } catch (error) {
    return `// Error loading source code: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Extract function source code from a module
 */
export function extractFunctionSource(
  fn: Function,
  functionName: string
): string {
  try {
    const source = fn.toString();
    return `function ${functionName}${source.substring(source.indexOf('('))}`;
  } catch {
    return `// Unable to extract source for ${functionName}`;
  }
}

/**
 * Get file path for a model
 */
export function getModelFilePath(
  contentType: string,
  modelName: string,
  isLocked: boolean
): string {
  if (!isLocked) {
    return 'Database-defined model (no file)';
  }

  const sanitizedName = modelName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  return `src/lib/models/locked/${contentType}/${sanitizedName}.ts`;
}

/**
 * Load edge function source code
 */
export async function loadEdgeFunctionSource(
  functionName: string
): Promise<string> {
  // In production, this would fetch from the actual file
  const edgeFunctionSources: Record<string, string> = {
    'generate-content': `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { generationId, model_config, model_schema, prompt, custom_parameters, test_mode } = await req.json();

    // Authentication
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Process generation
    // ... implementation details

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});`,
  };

  return edgeFunctionSources[functionName] || `// Source code for ${functionName} not available`;
}

/**
 * Analyze code complexity
 */
export interface CodeMetrics {
  lines: number;
  functions: number;
  complexity: number; // Cyclomatic complexity estimate
  dependencies: string[];
}

export function analyzeCode(code: string): CodeMetrics {
  const lines = code.split('\n').length;
  const functions = (code.match(/function\s+\w+/g) || []).length;
  const conditionals = (code.match(/if\s*\(|switch\s*\(|while\s*\(|for\s*\(/g) || []).length;
  const complexity = conditionals + functions + 1;

  // Extract imports/dependencies
  const importMatches = code.match(/import\s+.*from\s+['"](.+)['"]/g) || [];
  const dependencies = importMatches.map(imp => {
    const match = imp.match(/from\s+['"](.+)['"]/);
    return match ? match[1] : '';
  }).filter(Boolean);

  return {
    lines,
    functions,
    complexity,
    dependencies,
  };
}

/**
 * Format code with basic prettification
 */
export function formatCode(code: string, _language: string = 'typescript'): string {
  // Basic formatting - in production, use prettier
  return code;
}

/**
 * Get execution context color for UI
 */
export function getExecutionContextColor(context: string): string {
  const colors: Record<string, string> = {
    client: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    edge_function: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    webhook: 'bg-green-500/10 text-green-700 border-green-500/20',
    database: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  };
  return colors[context] || 'bg-gray-500/10 text-gray-700 border-gray-500/20';
}
