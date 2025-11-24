/**
 * Model File Editor Service
 * Generates migration scripts to update model .ts files
 */

import type { ModelConfiguration } from '@/types/schema';
import { getAllModels, type ModelModule } from '@/lib/models/registry';

export interface ModelUpdatePayload {
  recordId: string;
  updates: Partial<ModelConfiguration>;
}

/**
 * Generate a Node.js script that updates model files
 */
export function generateModelUpdateScript(updates: ModelUpdatePayload[]): string {
  const script = `/**
 * Auto-generated model update script
 * Generated: ${new Date().toISOString()}
 *
 * Run with: node update-models.cjs
 */
const fs = require('fs');
const path = require('path');

const updates = ${JSON.stringify(updates, null, 2)};

function updateModelFile(recordId, updates) {
  // Find the model file by record ID
  const searchDirs = [
    'src/lib/models/locked/image_editing',
    'src/lib/models/locked/prompt_to_image',
    'src/lib/models/locked/prompt_to_video',
    'src/lib/models/locked/image_to_video',
    'src/lib/models/locked/prompt_to_audio'
  ];

  let targetFile = null;
  for (const dir of searchDirs) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Check if this file contains the recordId
      if (content.includes(\`recordId: "\${recordId}"\`)) {
        targetFile = filePath;
        break;
      }
    }
    if (targetFile) break;
  }

  if (!targetFile) {
    console.error(\`❌ Could not find model file for record ID: \${recordId}\`);
    return false;
  }

  console.log(\`📝 Updating: \${path.basename(targetFile)}\`);

  let content = fs.readFileSync(targetFile, 'utf8');
  let modified = false;

  // Update each field
  for (const [key, value] of Object.entries(updates)) {
    const tsKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()); // Convert snake_case to camelCase

    let pattern, replacement;

    if (typeof value === 'string') {
      pattern = new RegExp(\`\${tsKey}:\\s*"[^"]*"\`, 'g');
      replacement = \`\${tsKey}: "\${value}"\`;
    } else if (typeof value === 'number') {
      pattern = new RegExp(\`\${tsKey}:\\s*\\d+(\\.\\d+)?\`, 'g');
      replacement = \`\${tsKey}: \${value}\`;
    } else if (typeof value === 'boolean') {
      pattern = new RegExp(\`\${tsKey}:\\s*(true|false)\`, 'g');
      replacement = \`\${tsKey}: \${value}\`;
    } else if (value === null) {
      pattern = new RegExp(\`\${tsKey}:\\s*[^,]+\`, 'g');
      replacement = \`\${tsKey}: null\`;
    } else if (typeof value === 'object') {
      pattern = new RegExp(\`\${tsKey}:\\s*{[^}]*}\`, 'g');
      replacement = \`\${tsKey}: \${JSON.stringify(value)}\`;
    }

    if (pattern && content.match(pattern)) {
      content = content.replace(pattern, replacement);
      modified = true;
      console.log(\`  ✓ Updated \${key}\`);
    }
  }

  if (modified) {
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log(\`  ✅ Saved changes\`);
    return true;
  } else {
    console.log(\`  ⚠️  No changes made\`);
    return false;
  }
}

function main() {
  console.log('🔧 Starting model file updates...\\n');

  let successCount = 0;
  let failCount = 0;

  for (const update of updates) {
    const success = updateModelFile(update.recordId, update.updates);
    if (success) successCount++;
    else failCount++;
    console.log('');
  }

  console.log('='.repeat(60));
  console.log(\`✅ Updated: \${successCount} models\`);
  if (failCount > 0) {
    console.log(\`❌ Failed: \${failCount} models\`);
  }
  console.log('='.repeat(60));
  console.log('\\n📋 Next steps:');
  console.log('1. Review the changes with: git diff');
  console.log('2. Commit: git add . && git commit -m "Update model configs"');
  console.log('3. Push: git push\\n');
}

main();
`;

  return script;
}

/**
 * Generate script to create a new model file
 */
export function generateNewModelScript(model: Partial<ModelConfiguration>): string {
  const contentType = model.content_type || 'prompt_to_image';
  const modelName = (model.model_name || 'New Model').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${modelName}.ts`;

  const script = `/**
 * Auto-generated new model script
 * Generated: ${new Date().toISOString()}
 *
 * Run with: node create-model.cjs
 */
const fs = require('fs');
const path = require('path');

const contentType = '${contentType}';
const fileName = '${fileName}';
const targetDir = path.join('src/lib/models/locked', contentType);

const modelContent = \`import { getGenerationType } from '@/lib/models/registry';
import { supabase } from "@/integrations/supabase/client";
import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";
import { reserveCredits } from "@/lib/models/creditDeduction";

export const MODEL_CONFIG = {
  modelId: "${model.id || ''}",
  recordId: "${model.record_id || ''}",
  modelName: "${model.model_name || ''}",
  provider: "${model.provider || ''}",
  contentType: "${contentType}",
  baseCreditCost: ${model.base_token_cost || 1},
  estimatedTimeSeconds: ${model.estimated_time_seconds || 30},
  costMultipliers: ${JSON.stringify(model.cost_multipliers || {})},
  apiEndpoint: ${model.api_endpoint ? `"${model.api_endpoint}"` : 'null'},
  payloadStructure: "${model.payload_structure || 'wrapper'}",
  maxImages: ${model.max_images || 0},
  defaultOutputs: ${model.default_outputs || 1},

  isActive: ${model.is_active !== false},
  logoUrl: ${model.logo_url ? `"${model.logo_url}"` : 'null'},
  modelFamily: ${model.model_family ? `"${model.model_family}"` : 'null'},
  variantName: ${model.variant_name ? `"${model.variant_name}"` : 'null'},
  displayOrderInFamily: ${(model as any).display_order_in_family || 0},

  isLocked: false,
  lockedFilePath: "src/lib/models/locked/${contentType}/${fileName}"
} as const;

export const SCHEMA = ${JSON.stringify(model.input_schema || {}, null, 2)};

export async function execute(params: ExecuteGenerationParams): Promise<string> {
  const { prompt, modelParameters, userId, startPolling } = params;

  // TODO: Implement model-specific execution logic
  throw new Error('Model execution not yet implemented');
}

export function validate(inputs: Record<string, any>): { valid: boolean; error?: string } {
  // Basic validation - check for required fields and types
  if (!inputs || typeof inputs !== 'object') {
    return { valid: false, error: 'Inputs must be a non-null object' };
  }

  // Validate prompt if present (common across most models)
  if ('prompt' in inputs) {
    if (typeof inputs.prompt !== 'string') {
      return { valid: false, error: 'Prompt must be a string' };
    }
    if (inputs.prompt.length < 3) {
      return { valid: false, error: 'Prompt must be at least 3 characters' };
    }
    if (inputs.prompt.length > 10000) {
      return { valid: false, error: 'Prompt must not exceed 10,000 characters' };
    }
  }

  // Validate numeric parameters
  const numericFields = ['width', 'height', 'duration', 'fps', 'seed', 'num_inference_steps'];
  for (const field of numericFields) {
    if (field in inputs) {
      if (typeof inputs[field] !== 'number' || !Number.isFinite(inputs[field])) {
        return { valid: false, error: \`\${field} must be a finite number\` };
      }
      if (inputs[field] < 0) {
        return { valid: false, error: \`\${field} must be non-negative\` };
      }
    }
  }

  // Validate URLs if present
  const urlFields = ['image_url', 'image_urls', 'input_image', 'startFrame', 'endFrame'];
  for (const field of urlFields) {
    if (field in inputs) {
      const value = inputs[field];
      if (Array.isArray(value)) {
        for (const url of value) {
          if (typeof url !== 'string' || !url.startsWith('http')) {
            return { valid: false, error: \`\${field} must contain valid HTTP(S) URLs\` };
          }
        }
      } else if (value !== null && value !== undefined) {
        if (typeof value !== 'string' || !value.startsWith('http')) {
          return { valid: false, error: \`\${field} must be a valid HTTP(S) URL\` };
        }
      }
    }
  }

  // Check for suspicious patterns (SQL injection, XSS)
  const stringValues = Object.values(inputs).filter(v => typeof v === 'string');
  for (const value of stringValues) {
    // Check for SQL injection patterns
    if (/(\b(union|select|insert|update|delete|drop|create|alter|exec|script)\b)/i.test(value)) {
      return { valid: false, error: 'Invalid characters detected in input' };
    }
    // Check for script tags
    if (/<script|javascript:|onerror=/i.test(value)) {
      return { valid: false, error: 'Invalid characters detected in input' };
    }
  }

  return { valid: true };
}

export function calculateCost(inputs: Record<string, any>): number {
  return MODEL_CONFIG.baseCreditCost;
}
\`;

const filePath = path.join(targetDir, fileName);

// Check if file already exists
if (fs.existsSync(filePath)) {
  console.error(\`❌ File already exists: \${filePath}\`);
  console.log('   Choose a different model name or delete the existing file first.\\n');
  process.exit(1);
}

// Create directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(\`📁 Created directory: \${targetDir}\`);
}

// Write the file
fs.writeFileSync(filePath, modelContent, 'utf8');
console.log(\`✅ Created model file: \${filePath}\\n\`);

console.log('📋 Next steps:');
console.log('1. Edit the file to implement execute(), validate(), and calculateCost()');
console.log('2. Update SCHEMA with correct input parameters');
console.log(\`3. Import in src/lib/models/locked/\${contentType}/index.ts\`);
console.log('4. Add to registry exports');
console.log('5. Test the model');
console.log('6. Commit: git add . && git commit -m "Add ${model.model_name} model"\\n');
`;

  return script;
}

/**
 * Generate script to delete (deactivate) a model
 */
export function generateModelDeleteScript(recordId: string): string {
  return generateModelUpdateScript([{
    recordId,
    updates: { is_active: false }
  }]);
}

/**
 * Download a script file
 */
export function downloadScript(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Check if a model is locked
 */
export function isModelLocked(recordId: string): boolean {
  const models = getAllModels();
  const model = models.find(m => m.MODEL_CONFIG.recordId === recordId);
  return model?.MODEL_CONFIG.isLocked || false;
}

/**
 * Get lock status for all models
 */
export function getLockStatuses(): Record<string, boolean> {
  const models = getAllModels();
  const statuses: Record<string, boolean> = {};

  for (const model of models) {
    statuses[model.MODEL_CONFIG.recordId] = model.MODEL_CONFIG.isLocked || false;
  }

  return statuses;
}

/**
 * Generate script to toggle model lock status
 */
export function generateLockToggleScript(recordId: string, lock: boolean): string {
  return generateModelUpdateScript([{
    recordId,
    updates: { is_locked: lock } as any
  }]);
}
