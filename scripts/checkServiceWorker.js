#!/usr/bin/env node
/**
 * Pre-build check script to prevent service worker files from being deployed
 * Exits with error code 1 if any service worker files are found
 */

const fs = require('fs');
const path = require('path');

// Files that should not exist
const forbiddenFiles = [
  'public/sw.js',
  'public/service-worker.js',
  'dist/sw.js',
  'dist/service-worker.js',
  'src/sw.js',
  'src/service-worker.js',
];

// Patterns to search for in source files
const forbiddenPatterns = [
  'navigator.serviceWorker.register',
];

let hasIssues = false;

// Check for forbidden files
console.log('🔍 Checking for service worker files...');
forbiddenFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.error(`❌ ERROR: Service worker file found: ${file}`);
    console.error(`   This will cause caching issues. Delete it immediately.`);
    hasIssues = true;
  }
});

// Check for service worker registration code
console.log('🔍 Checking source code for SW registration...');
function searchDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      // Skip node_modules and dist
      if (file.name === 'node_modules' || file.name === 'dist' || file.name === '.git') {
        continue;
      }
      searchDirectory(fullPath);
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
      // Skip service worker cleanup utility
      if (file.name === 'serviceWorkerCleanup.ts' || file.name === 'cacheManagement.ts') {
        continue;
      }
      
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      for (const pattern of forbiddenPatterns) {
        if (content.includes(pattern)) {
          console.error(`❌ ERROR: Service worker registration found in: ${fullPath}`);
          console.error(`   Pattern: "${pattern}"`);
          console.error(`   Remove this code to prevent caching issues.`);
          hasIssues = true;
        }
      }
    }
  }
}

searchDirectory(path.join(process.cwd(), 'src'));

// Final verdict
console.log('');
if (hasIssues) {
  console.error('❌ BUILD ABORTED: Service worker files or registration code detected');
  console.error('   Please fix the issues above before deploying.');
  process.exit(1);
} else {
  console.log('✅ No service worker files detected. Build is safe to proceed.');
  process.exit(0);
}
