#!/usr/bin/env node

/**
 * Build Guard: Verify that dist/index.html references built assets, not source files
 * This prevents deploying raw source code instead of the built app
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const distIndexPath = join(process.cwd(), 'dist', 'index.html');

console.log('🔍 Checking build output...');

// Check if dist/index.html exists
if (!existsSync(distIndexPath)) {
  console.error('❌ dist/index.html not found. Did the build fail?');
  process.exit(1);
}

// Read the built index.html
const indexContent = readFileSync(distIndexPath, 'utf-8');

// Check for source file references (bad)
if (indexContent.includes('/src/main.tsx')) {
  console.error('❌ Build Error: dist/index.html still references /src/main.tsx');
  console.error('   This means the build didn\'t process correctly.');
  console.error('   The deployed app will not work.');
  console.error('');
  console.error('   Try:');
  console.error('   1. Delete dist/ and node_modules/.vite/');
  console.error('   2. Run: npm run build');
  process.exit(1);
}

// Check for built assets (good)
const hasBuiltAssets = /\/assets\/[^"]+\.js/.test(indexContent);
if (!hasBuiltAssets) {
  console.error('❌ Build Error: No built JavaScript assets found in dist/index.html');
  console.error('   Expected to find /assets/*.js references');
  process.exit(1);
}

console.log('✅ Build output looks good!');
console.log('   - No source file references found');
console.log('   - Built assets are properly referenced');
console.log('');
console.log('📦 Ready to deploy the dist/ folder');
