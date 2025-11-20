/**
 * Add missing logoUrl fields to models that don't have them
 */
const fs = require('fs');
const path = require('path');

const PROVIDER_LOGO_MAP = {
  'kie_ai': {
    'Seedream': '/logos/seedream.svg',
    'Seedance': '/logos/seedance.svg',
    'WAN': '/logos/wan.svg',
    'Remove Background': '/logos/removebg.svg',
    'Recraft': '/logos/recraft.svg',
  },
  'runware': {
    'Seedance': '/logos/seedance.svg',
  },
  'lovable_ai_sync': {
    'Qwen': '/logos/qwen.svg',
  },
  'jasper_ai': {
    'Jasper': '/logos/jasper.svg',
  },
  'hidream': {
    'HiDream': '/logos/hidream.svg',
  },
  'ultradetail': {
    'Ultra': '/logos/ultradetail.svg',
  }
};

function addLogoUrl(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has logoUrl
  if (content.includes('logoUrl:')) {
    console.log(`  ✅ Already has logoUrl`);
    return false;
  }

  // Extract model info
  const modelNameMatch = content.match(/modelName:\s*"([^"]+)"/);
  const providerMatch = content.match(/provider:\s*"([^"]+)"/);

  if (!modelNameMatch || !providerMatch) {
    console.log(`  ⚠️  Could not extract model name or provider`);
    return false;
  }

  const modelName = modelNameMatch[1];
  const provider = providerMatch[1];

  // Determine logo URL
  let logoUrl = null;

  // Try to find logo by provider and model family
  if (PROVIDER_LOGO_MAP[provider]) {
    const providerLogos = PROVIDER_LOGO_MAP[provider];
    for (const [family, logo] of Object.entries(providerLogos)) {
      if (modelName.includes(family)) {
        logoUrl = logo;
        break;
      }
    }
  }

  // Fallback to provider-based logo
  if (!logoUrl) {
    const providerToLogo = {
      'kie_ai': '/logos/kie.svg',
      'runware': '/logos/runware.svg',
      'lovable_ai_sync': '/logos/qwen.svg',
      'jasper_ai': '/logos/jasper.svg',
      'hidream': '/logos/hidream.svg',
      'ultradetail': '/logos/ultradetail.svg'
    };
    logoUrl = providerToLogo[provider] || '/logos/generic.svg';
  }

  console.log(`  🔧 Adding logoUrl: ${logoUrl}`);

  // Find where to insert logoUrl (after isActive or before modelFamily)
  const insertAfter = 'isActive: true,';
  const insertPos = content.indexOf(insertAfter);

  if (insertPos === -1) {
    console.log(`  ⚠️  Could not find insertion point`);
    return false;
  }

  const beforeInsert = content.substring(0, insertPos + insertAfter.length);
  const afterInsert = content.substring(insertPos + insertAfter.length);

  // Insert logoUrl field
  const updatedContent = beforeInsert + `\n  logoUrl: "${logoUrl}",` + afterInsert;

  fs.writeFileSync(filePath, updatedContent, 'utf8');
  return true;
}

function main() {
  console.log('🔧 Adding missing logoUrl fields to models...\n');

  const modelsWithoutLogo = [
    './image_to_video/Seedream_V1_Pro.ts',
    './image_to_video/Seedance_V1_Lite.ts',
    './image_to_video/WAN_2_2_Turbo.ts',
    './image_to_video/Seedance_V1_0_Pro_Fast_runware.ts',
    './prompt_to_image/Qwen_QwenVL.ts',
    './prompt_to_image/Jasper_Text_to_Image.ts',
    './prompt_to_image/HiDream_Dev.ts',
    './prompt_to_image/HiDream_Fast.ts',
    './prompt_to_image/Ultra_Detail_V0.ts',
    './prompt_to_image/Seedream_V3.ts',
    './prompt_to_image/Seedream_V4.ts',
    './prompt_to_video/Seedream_V1_Pro.ts',
    './prompt_to_video/Seedance_V1_Lite.ts',
    './prompt_to_video/WAN_2_2_Turbo.ts',
    './prompt_to_video/Seedance_V1_0_Pro_Fast_runware.ts',
    './image_editing/Qwen_Image_to_Image.ts',
    './image_editing/Qwen_Image_Editor.ts',
    './image_editing/Remove_Background_kie_ai.ts',
    './image_editing/Seedream_V4.ts',
    './image_editing/Recraft_Crisp_Upscale.ts'
  ];

  let added = 0;
  let skipped = 0;

  for (const relPath of modelsWithoutLogo) {
    const fullPath = path.join(__dirname, 'src/lib/models/locked', relPath);
    console.log(`\n📝 ${relPath}`);

    try {
      const wasAdded = addLogoUrl(fullPath);
      if (wasAdded) added++;
      else skipped++;
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Complete!`);
  console.log(`   Added: ${added} logoUrl fields`);
  console.log(`   Skipped: ${skipped} files`);
  console.log(`${'='.repeat(60)}\n`);
}

main();
