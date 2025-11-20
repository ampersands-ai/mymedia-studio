#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const DIRS = [
  'src/lib/models/locked/prompt_to_image',
  'src/lib/models/locked/prompt_to_video',
  'src/lib/models/locked/image_to_video',
  'src/lib/models/locked/image_editing',
  'src/lib/models/locked/prompt_to_audio',
];

function updateFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf-8');
    
    // Skip if already updated
    if (content.includes('deductCredits')) {
      console.log(`✓ Skip: ${filePath}`);
      return false;
    }

    // Add import
    content = content.replace(
      'import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";',
      'import type { ExecuteGenerationParams } from "@/lib/generation/executeGeneration";\nimport { deductCredits } from "@/lib/models/creditDeduction";'
    );

    // Pattern 1: Compact validation
    content = content.replace(
      /(const validation = validate\(inputs\);[^\n]*if \(!validation\.valid\) throw new Error\(validation\.error\);)\s*(\n\s*const { data: gen, error })/g,
      '$1\n  const cost = calculateCost(inputs);\n  await deductCredits(userId, cost);$2'
    );

    // Pattern 2: Block validation
    content = content.replace(
      /(const validation = validate\(inputs\);\s*\n\s*if \(!validation\.valid\) {\s*\n\s*throw new Error\(validation\.error\);\s*\n\s*})\s*(\n\s*const { data: gen, error })/g,
      '$1\n\n  const cost = calculateCost(inputs);\n  await deductCredits(userId, cost);$2'
    );

    // Replace tokens_used with cost variable
    content = content.replace(
      /tokens_used: calculateCost\(inputs\)/g,
      'tokens_used: cost'
    );

    writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Updated: ${filePath}`);
    return true;
  } catch (e) {
    console.error(`✗ Error: ${filePath}`, e.message);
    return null;
  }
}

let updated = 0, skipped = 0, errors = 0;

for (const dir of DIRS) {
  const files = readdirSync(dir).filter(f => f.endsWith('.ts'));
  for (const file of files) {
    const result = updateFile(join(dir, file));
    if (result === true) updated++;
    else if (result === false) skipped++;
    else errors++;
  }
}

console.log(`\nUpdated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
