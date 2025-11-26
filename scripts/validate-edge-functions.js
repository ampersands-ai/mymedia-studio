#!/usr/bin/env node

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EDGE_FUNCTIONS_DIR = join(__dirname, '..', 'supabase', 'functions');

// Deprecated patterns to check for
const DEPRECATED_PATTERNS = [
  {
    pattern: /fetch\s*\(\s*`.*\/rest\/v1\//,
    message: 'Direct fetch to Supabase REST API detected. Use supabase.from() instead.',
    severity: 'error'
  },
  {
    pattern: /fetch\s*\(\s*`.*\/functions\/v1\//,
    message: 'Direct fetch to Supabase Functions API detected. Use supabase.functions.invoke() instead.',
    severity: 'error'
  },
  {
    pattern: /supabase\.rpc\s*\(\s*['"]execute_sql['"]/,
    message: 'Raw SQL execution detected. Use supabase.from() methods instead for security.',
    severity: 'error'
  },
  {
    pattern: /\.query\s*\(/,
    message: 'Raw query method detected. Use supabase.from() methods instead.',
    severity: 'error'
  }
];

function validateFile(filePath, fileName) {
  const content = readFileSync(filePath, 'utf-8');
  const issues = [];

  DEPRECATED_PATTERNS.forEach(({ pattern, message, severity }) => {
    if (pattern.test(content)) {
      issues.push({ fileName, message, severity });
    }
  });

  return issues;
}

function validateEdgeFunctions() {
  if (!existsSync(EDGE_FUNCTIONS_DIR)) {
    console.log('✅ No edge functions directory found, skipping validation');
    return [];
  }

  const allIssues = [];
  const functionDirs = readdirSync(EDGE_FUNCTIONS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  functionDirs.forEach(funcDir => {
    const indexPath = join(EDGE_FUNCTIONS_DIR, funcDir, 'index.ts');
    if (existsSync(indexPath)) {
      const issues = validateFile(indexPath, `${funcDir}/index.ts`);
      allIssues.push(...issues);
    }
  });

  return allIssues;
}

// Main execution
console.log('🔍 Validating edge functions for deprecated patterns...\n');

const issues = validateEdgeFunctions();

if (issues.length === 0) {
  console.log('✅ Edge functions validation passed');
  process.exit(0);
} else {
  console.error('❌ Edge functions validation failed:\n');
  issues.forEach(({ fileName, message, severity }) => {
    const icon = severity === 'error' ? '🚨' : '⚠️';
    console.error(`${icon} ${fileName}: ${message}`);
  });
  console.error('');
  process.exit(1);
}
