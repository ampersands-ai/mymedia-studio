#!/usr/bin/env node

/**
 * Validates edge functions for deprecated patterns
 * Prevents use of deprecated Deno serve imports and outdated Supabase client imports
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationError {
  file: string;
  line: number;
  pattern: string;
  message: string;
}

const DEPRECATED_PATTERNS = [
  {
    pattern: /import\s+{\s*serve\s*}\s+from\s+["']https:\/\/deno\.land\/std/,
    message: 'Deprecated Deno serve import. Use Deno.serve() instead.',
  },
  {
    pattern: /import\s+{\s*serve\s*}\s+from\s+["']std\/http\/server\.ts["']/,
    message: 'Deprecated Deno serve import. Use Deno.serve() instead.',
  },
  {
    pattern: /import\s+{\s*createClient\s*}\s+from\s+['"]supabase['"]/,
    message: 'Incorrect Supabase import. Use: import { createClient } from "https://esm.sh/@supabase/supabase-js@2"',
  },
  {
    pattern: /serve\s*\(\s*async\s*\(\s*req/,
    message: 'Deprecated serve() function call. Use Deno.serve(async (req) => {...}) instead.',
  },
  {
    pattern: /serve\s*\(\s*handler\s*\)/,
    message: 'Deprecated serve(handler). Use Deno.serve(handler) instead.',
  },
];

function validateFile(filePath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    DEPRECATED_PATTERNS.forEach(({ pattern, message }) => {
      if (pattern.test(line)) {
        errors.push({
          file: filePath,
          line: index + 1,
          pattern: pattern.toString(),
          message,
        });
      }
    });
  });

  return errors;
}

function scanDirectory(dir: string): ValidationError[] {
  let allErrors: ValidationError[] = [];

  function scan(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        const errors = validateFile(fullPath);
        allErrors = allErrors.concat(errors);
      }
    }
  }

  scan(dir);
  return allErrors;
}

function main() {
  const edgeFunctionsDir = path.join(process.cwd(), 'supabase', 'functions');

  if (!fs.existsSync(edgeFunctionsDir)) {
    console.log('✅ No edge functions directory found. Skipping validation.');
    process.exit(0);
  }

  console.log('🔍 Validating edge functions for deprecated patterns...\n');

  const errors = scanDirectory(edgeFunctionsDir);

  if (errors.length === 0) {
    console.log('✅ All edge functions validated successfully!');
    console.log('   No deprecated patterns found.\n');
    process.exit(0);
  }

  console.error('❌ Validation failed! Found deprecated patterns:\n');

  errors.forEach((error) => {
    console.error(`  ${error.file}:${error.line}`);
    console.error(`    ${error.message}\n`);
  });

  console.error(`\n📋 Summary: ${errors.length} error(s) found`);
  console.error('\n💡 Fix these issues before committing:\n');
  console.error('  1. Replace: import { serve } from "https://deno.land/std..."');
  console.error('     With: (remove import, use Deno.serve directly)\n');
  console.error('  2. Replace: serve(async (req) => {');
  console.error('     With: Deno.serve(async (req) => {\n');
  console.error('  3. Replace: serve(handler)');
  console.error('     With: Deno.serve(handler)\n');
  console.error('  4. Replace: import { createClient } from "supabase"');
  console.error('     With: import { createClient } from "https://esm.sh/@supabase/supabase-js@2"\n');

  process.exit(1);
}

main();
