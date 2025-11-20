/**
 * Fix database type constraint by using getGenerationType()
 * Changes: type: MODEL_CONFIG.contentType → type: getGenerationType(MODEL_CONFIG.contentType)
 */
const fs = require('fs');
const path = require('path');

function fixGenerationType(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if it's the ModelFileGenerator.ts
  if (filePath.includes('ModelFileGenerator.ts')) {
    console.log(`  ⏭️  Skipping ModelFileGenerator.ts`);
    return false;
  }

  // Check if file already has the fix
  if (content.includes('getGenerationType(MODEL_CONFIG.contentType)')) {
    console.log(`  ✅ Already fixed`);
    return false;
  }

  // Check if file needs fixing
  if (!content.includes('type: MODEL_CONFIG.contentType')) {
    console.log(`  ⚠️  No type: MODEL_CONFIG.contentType found`);
    return false;
  }

  console.log(`  🔧 Fixing type field...`);

  // Step 1: Add import for getGenerationType if not already present
  if (!content.includes('getGenerationType')) {
    // Find the existing imports from '../'
    const importMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"]@\/lib\/models\/registry['"]/);

    if (importMatch) {
      // Add getGenerationType to existing import
      const currentImports = importMatch[1].trim();
      const newImports = currentImports + ', getGenerationType';
      content = content.replace(
        /import\s+{[^}]+}\s+from\s+['"]@\/lib\/models\/registry['"]/,
        `import { ${newImports} } from '@/lib/models/registry'`
      );
      console.log(`     ✓ Added to existing import`);
    } else {
      // Add new import at the top (after initial comments and before first import)
      const lines = content.split('\n');
      let insertIndex = 0;

      // Find first non-comment, non-empty line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
          insertIndex = i;
          break;
        }
      }

      lines.splice(insertIndex, 0, `import { getGenerationType } from '@/lib/models/registry';`);
      content = lines.join('\n');
      console.log(`     ✓ Added new import statement`);
    }
  }

  // Step 2: Replace type: MODEL_CONFIG.contentType with getGenerationType()
  content = content.replace(
    /type:\s*MODEL_CONFIG\.contentType,/g,
    'type: getGenerationType(MODEL_CONFIG.contentType),'
  );
  console.log(`     ✓ Updated type field`);

  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function findModelFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      files.push(...findModelFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') &&
               entry.name !== 'index.ts' &&
               !entry.name.includes('getKieApiKey') &&
               !entry.name.includes('getRunwareApiKey')) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  console.log('🔧 Fixing database type constraint by using getGenerationType()...\n');

  const lockedDir = path.join(__dirname, 'src/lib/models/locked');
  const modelFiles = findModelFiles(lockedDir);

  console.log(`Found ${modelFiles.length} model files\n`);

  let fixed = 0;
  let alreadyFixed = 0;
  let skipped = 0;

  for (const file of modelFiles) {
    const relativePath = file.replace(__dirname + '/', '');
    console.log(`\n📝 ${relativePath}`);

    try {
      const wasFixed = fixGenerationType(file);
      if (wasFixed) fixed++;
      else if (file.includes('ModelFileGenerator.ts')) skipped++;
      else alreadyFixed++;
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Fix complete!`);
  console.log(`   Fixed: ${fixed} files`);
  console.log(`   Already fixed: ${alreadyFixed} files`);
  console.log(`   Skipped: ${skipped} files`);
  console.log(`   Total: ${modelFiles.length} files`);
  console.log(`${'='.repeat(60)}\n`);
}

main();
