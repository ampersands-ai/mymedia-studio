/**
 * Script to update all MODEL_CONFIG objects with complete metadata
 * Adds: isActive, logoUrl, modelFamily, variantName, displayOrderInFamily, isLocked, lockedFilePath
 */
const fs = require('fs');
const path = require('path');

// Helper to extract family and variant from model name
function extractMetadata(modelName, provider, filePath) {
  const name = modelName.trim();

  // Extract family
  let family = null;
  let variant = null;
  let displayOrder = 2; // Default to middle priority

  // Google models
  if (name.includes('Google') || name.includes('Veo') || name.includes('Imagen') || name.includes('Nano Banana')) {
    family = 'Google';
    if (name.includes('Veo')) variant = name.replace('Google ', '');
    else if (name.includes('Imagen')) variant = name.replace('Google ', '');
    else if (name.includes('Nano Banana')) variant = 'Nano Banana';
    else variant = name;
  }
  // FLUX models
  else if (name.includes('FLUX') || name.includes('Flux')) {
    family = 'FLUX';
    variant = name.replace(/^FLUX\.?\s*/i, '').replace(/^Flux\.?\s*/i, '');
  }
  // Kling models
  else if (name.includes('Kling')) {
    family = 'Kling';
    variant = name.replace('Kling ', '');
  }
  // Sora models
  else if (name.includes('Sora')) {
    family = 'OpenAI';
    variant = name;
  }
  // ChatGPT models
  else if (name.includes('ChatGPT') || name.includes('GPT')) {
    family = 'OpenAI';
    variant = name;
  }
  // Runway models
  else if (name.includes('Runway')) {
    family = 'Runway';
    variant = name.replace('Runway ', '') || name;
  }
  // Midjourney
  else if (name.includes('Midjourney')) {
    family = 'Midjourney';
    variant = name.replace('Midjourney ', '') || name;
  }
  // Ideogram
  else if (name.includes('Ideogram')) {
    family = 'Ideogram';
    variant = name.replace('Ideogram ', '');
  }
  // Recraft
  else if (name.includes('Recraft')) {
    family = 'Recraft';
    variant = name.replace('Recraft ', '');
  }
  // Seedream/Seedance
  else if (name.includes('Seedream') || name.includes('Seedance')) {
    family = name.includes('Seedream') ? 'Seedream' : 'Seedance';
    variant = name;
  }
  // HiDream
  else if (name.includes('HiDream')) {
    family = 'HiDream';
    variant = name.replace('HiDream ', '');
  }
  // Grok
  else if (name.includes('Grok')) {
    family = 'xAI';
    variant = name;
  }
  // WAN
  else if (name.includes('WAN')) {
    family = 'WAN';
    variant = name;
  }
  // Qwen
  else if (name.includes('Qwen')) {
    family = 'Qwen';
    variant = name.replace('Qwen ', '');
  }
  // ElevenLabs
  else if (name.includes('ElevenLabs') || name.includes('Eleven')) {
    family = 'ElevenLabs';
    variant = name.replace('ElevenLabs ', '').replace('Eleven Labs ', '');
  }
  // Suno
  else if (name.includes('Suno')) {
    family = 'Suno';
    variant = name;
  }
  // Jasper
  else if (name.includes('Jasper')) {
    family = 'Jasper';
    variant = name.replace('Jasper ', '');
  }
  // Runware models (use actual model name)
  else if (name.includes('runware') || provider === 'runware') {
    family = 'Runware';
    variant = name.replace('runware ', '').replace('runware:', '');
  }
  // Ultra Detail
  else if (name.includes('Ultra Detail')) {
    family = 'Ultra Detail';
    variant = name;
  }
  // Remove Background
  else if (name.includes('Remove Background')) {
    family = provider === 'runware' ? 'Runware' : 'KIE AI';
    variant = 'Remove Background';
  }
  // Default: use provider as family
  else {
    family = provider.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    variant = name;
  }

  // Determine display order (1=Fast, 2=Standard, 3=Pro/Premium)
  const lowerName = name.toLowerCase();
  if (lowerName.includes('ultra') || lowerName.includes('pro') || lowerName.includes('premium') || lowerName.includes('master') || lowerName.includes('hq')) {
    displayOrder = 3;
  } else if (lowerName.includes('fast') || lowerName.includes('turbo') || lowerName.includes('schnell') || lowerName.includes('lite')) {
    displayOrder = 1;
  } else if (lowerName.includes('standard')) {
    displayOrder = 2;
  }

  // Determine logo URL based on family/provider
  let logoUrl = null;
  const familyLower = (family || '').toLowerCase();
  if (familyLower.includes('google')) logoUrl = '/logos/google.svg';
  else if (familyLower.includes('flux')) logoUrl = '/logos/flux.svg';
  else if (familyLower.includes('kling')) logoUrl = '/logos/kling.svg';
  else if (familyLower.includes('openai') || familyLower.includes('sora') || familyLower.includes('chatgpt')) logoUrl = '/logos/openai.svg';
  else if (familyLower.includes('runway')) logoUrl = '/logos/runway.svg';
  else if (familyLower.includes('midjourney')) logoUrl = '/logos/midjourney.svg';
  else if (familyLower.includes('ideogram')) logoUrl = '/logos/ideogram.svg';
  else if (familyLower.includes('recraft')) logoUrl = '/logos/recraft.svg';
  else if (familyLower.includes('elevenlabs')) logoUrl = '/logos/elevenlabs.svg';
  else if (familyLower.includes('suno')) logoUrl = '/logos/suno.svg';
  else if (familyLower.includes('runware')) logoUrl = '/logos/runware.svg';
  else if (familyLower.includes('xai') || familyLower.includes('grok')) logoUrl = '/logos/xai.svg';

  return { family, variant, displayOrder, logoUrl };
}

// Find all model files
function findModelFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      files.push(...findModelFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && entry.name !== 'index.ts' && entry.name !== 'ModelFileGenerator.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

// Update a single model file
function updateModelFile(filePath) {
  console.log(`\n📝 Processing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');

  // Extract current MODEL_CONFIG
  const configMatch = content.match(/export const MODEL_CONFIG = ({[\s\S]*?}) as const;/);
  if (!configMatch) {
    console.log('  ⚠️  No MODEL_CONFIG found, skipping');
    return false;
  }

  const configStr = configMatch[1];

  // Parse key values (simple regex approach)
  const modelName = configStr.match(/modelName:\s*["']([^"']+)["']/)?.[1];
  const provider = configStr.match(/provider:\s*["']([^"']+)["']/)?.[1];
  const recordId = configStr.match(/recordId:\s*["']([^"']+)["']/)?.[1];

  if (!modelName || !provider) {
    console.log('  ⚠️  Could not extract modelName or provider, skipping');
    return false;
  }

  console.log(`  Model: ${modelName}`);
  console.log(`  Provider: ${provider}`);
  console.log(`  RecordId: ${recordId}`);

  // Check if already has new fields
  if (configStr.includes('isActive') || configStr.includes('isLocked')) {
    console.log('  ✅ Already updated, skipping');
    return false;
  }

  // Extract metadata
  const relativePath = filePath.replace(/^.*src\//, 'src/');
  const metadata = extractMetadata(modelName, provider, relativePath);

  console.log(`  Family: ${metadata.family}`);
  console.log(`  Variant: ${metadata.variant}`);
  console.log(`  Display Order: ${metadata.displayOrder}`);
  console.log(`  Logo: ${metadata.logoUrl || 'none'}`);

  // Build new fields to add
  const newFields = `
  // UI metadata
  isActive: true,${metadata.logoUrl ? `\n  logoUrl: "${metadata.logoUrl}",` : ''}${metadata.family ? `\n  modelFamily: "${metadata.family}",` : ''}${metadata.variant ? `\n  variantName: "${metadata.variant}",` : ''}
  displayOrderInFamily: ${metadata.displayOrder},

  // Lock system
  isLocked: true,
  lockedFilePath: "${relativePath}"`;

  // Replace MODEL_CONFIG
  // Find the last field before "} as const"
  const newConfigStr = configStr.replace(/(\s*)(}\s*)$/, `,$1${newFields}$1$2`);
  const newConfig = `export const MODEL_CONFIG = ${newConfigStr} as const;`;

  const newContent = content.replace(/export const MODEL_CONFIG = {[\s\S]*?} as const;/, newConfig);

  // Write back
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('  ✅ Updated successfully');

  return true;
}

// Main execution
function main() {
  console.log('🚀 Starting MODEL_CONFIG update for all model files...\n');

  const lockedDir = path.join(__dirname, 'src/lib/models/locked');
  const modelFiles = findModelFiles(lockedDir);

  console.log(`Found ${modelFiles.length} model files\n`);

  let updated = 0;
  let skipped = 0;

  for (const file of modelFiles) {
    try {
      const result = updateModelFile(file);
      if (result) updated++;
      else skipped++;
    } catch (error) {
      console.error(`  ❌ Error updating ${file}:`, error.message);
      skipped++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Update complete!`);
  console.log(`   Updated: ${updated} files`);
  console.log(`   Skipped: ${skipped} files`);
  console.log(`   Total:   ${modelFiles.length} files`);
  console.log(`${'='.repeat(60)}\n`);
}

main();
