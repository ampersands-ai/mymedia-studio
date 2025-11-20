/**
 * Batch script to add credit deduction to all model files
 * This ensures all models deduct credits before execution
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const MODEL_DIRS = [
  'src/lib/models/locked/prompt_to_image',
  'src/lib/models/locked/prompt_to_video',
  'src/lib/models/locked/image_to_video',
  'src/lib/models/locked/image_editing',
  'src/lib/models/locked/prompt_to_audio',
];

function getAllModelFiles(): string[] {
  const files: string[] = [];
  for (const dir of MODEL_DIRS) {
    try {
      const dirFiles = readdirSync(dir);
      for (const file of dirFiles) {
        if (file.endsWith('.ts') && !file.includes('test')) {
          files.push(join(dir, file));
        }
      }
    } catch (e) {
      console.log(`Directory not found: ${dir}`);
    }
  }
  return files;
}

function addCreditDeduction(filePath: string): boolean {
  try {
    let content = readFileSync(filePath, 'utf-8');
    
    // Skip if already has credit deduction
    if (content.includes('deductCredits')) {
      console.log(`✓ Skip (already updated): ${filePath}`);
      return false;
    }

    // Add import if not present
    if (!content.includes('@/lib/models/creditDeduction')) {
      content = content.replace(
        /import type { ExecuteGenerationParams } from "@\/lib\/generation\/executeGeneration";/,
        'import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";\nimport { deductCredits } from "@/lib/models/creditDeduction";'
      );
    }

    // Pattern 1: Compact single-line validation
    content = content.replace(
      /(const validation = validate\(inputs\);[^\n]*if \(!validation\.valid\) throw new Error\(validation\.error\);)\s*(const { data: gen, error } = await supabase)/g,
      '$1\n  const cost = calculateCost(inputs);\n  await deductCredits(userId, cost);\n  $2'
    );

    // Pattern 2: Multi-line validation block
    content = content.replace(
      /(const validation = validate\(inputs\);\s*if \(!validation\.valid\) {\s*throw new Error\(validation\.error\);\s*})\s*(const { data: gen, error } = await supabase)/g,
      '$1\n\n  const cost = calculateCost(inputs);\n  await deductCredits(userId, cost);\n\n  $2'
    );

    // Replace calculateCost(inputs) in insert with cost variable
    content = content.replace(
      /tokens_used: calculateCost\(inputs\),/g,
      'tokens_used: cost,'
    );

    writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Updated: ${filePath}`);
    return true;
  } catch (e: any) {
    console.error(`✗ Error updating ${filePath}:`, e.message);
    return false;
  }
}

// Main execution
const files = getAllModelFiles();
console.log(`Found ${files.length} model files to update\n`);

let updated = 0;
let skipped = 0;
let errors = 0;

for (const file of files) {
  const result = addCreditDeduction(file);
  if (result === true) updated++;
  else if (result === false) skipped++;
  else errors++;
}

console.log(`\n=== Summary ===`);
console.log(`Total files: ${files.length}`);
console.log(`Updated: ${updated}`);
console.log(`Skipped: ${skipped}`);
console.log(`Errors: ${errors}`);
