/**
 * Fix contentType in all model files to match CreationGroup IDs
 * Directory name = correct contentType
 */
const fs = require('fs');
const path = require('path');

const DIRECTORY_TO_CONTENT_TYPE = {
  'image_editing': 'image_editing',
  'prompt_to_image': 'prompt_to_image',
  'prompt_to_video': 'prompt_to_video',
  'image_to_video': 'image_to_video',
  'prompt_to_audio': 'prompt_to_audio',
};

function fixContentType(filePath) {
  // Extract directory name from path
  const match = filePath.match(/\/(image_editing|prompt_to_image|prompt_to_video|image_to_video|prompt_to_audio)\//);
  if (!match) {
    console.log(`  ⚠️  Could not determine content type from path: ${filePath}`);
    return false;
  }

  const directory = match[1];
  const correctContentType = DIRECTORY_TO_CONTENT_TYPE[directory];

  let content = fs.readFileSync(filePath, 'utf8');

  // Check current contentType
  const currentMatch = content.match(/contentType:\s*["']([^"']+)["']/);
  if (!currentMatch) {
    console.log(`  ⚠️  No contentType found in: ${filePath}`);
    return false;
  }

  const currentContentType = currentMatch[1];

  if (currentContentType === correctContentType) {
    console.log(`  ✅ Already correct: ${correctContentType}`);
    return false;
  }

  console.log(`  🔧 Fixing: "${currentContentType}" → "${correctContentType}"`);

  // Replace contentType value
  content = content.replace(
    /contentType:\s*["'][^"']+["']/,
    `contentType: "${correctContentType}"`
  );

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
               entry.name !== 'ModelFileGenerator.ts' &&
               !entry.name.includes('getKieApiKey') &&
               !entry.name.includes('getRunwareApiKey')) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  console.log('🔧 Fixing contentType values to match CreationGroup IDs...\n');

  const lockedDir = path.join(__dirname, 'src/lib/models/locked');
  const modelFiles = findModelFiles(lockedDir);

  console.log(`Found ${modelFiles.length} model files\n`);

  let fixed = 0;
  let alreadyCorrect = 0;

  for (const file of modelFiles) {
    const relativePath = file.replace(__dirname + '/', '');
    console.log(`\n📝 ${relativePath}`);

    try {
      const wasFixed = fixContentType(file);
      if (wasFixed) fixed++;
      else alreadyCorrect++;
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Fix complete!`);
  console.log(`   Fixed: ${fixed} files`);
  console.log(`   Already correct: ${alreadyCorrect} files`);
  console.log(`   Total: ${modelFiles.length} files`);
  console.log(`${'='.repeat(60)}\n`);
}

main();
