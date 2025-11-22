#!/usr/bin/env python3
"""
Adds use_api_key field to all model files based on their provider and contentType
"""

import os
import re
from pathlib import Path

# Mapping of (provider, contentType) to use_api_key value
API_KEY_MAPPING = {
    ("kie_ai", "image_editing"): "KIE_AI_API_KEY_IMAGE_EDITING",
    ("kie_ai", "image_to_video"): "KIE_AI_API_KEY_IMAGE_TO_VIDEO",
    ("kie_ai", "prompt_to_image"): "KIE_AI_API_KEY_PROMPT_TO_IMAGE",
    ("kie_ai", "prompt_to_video"): "KIE_AI_API_KEY_PROMPT_TO_VIDEO",
    ("kie_ai", "prompt_to_audio"): "KIE_AI_API_KEY_PROMPT_TO_AUDIO",
    ("runware", "prompt_to_image"): "RUNWARE_API_KEY_PROMPT_TO_IMAGE",
    ("runware", "image_editing"): "RUNWARE_API_KEY_IMAGE_EDITING",
    ("runware", "image_to_video"): "RUNWARE_API_KEY_IMAGE_TO_VIDEO",
}

# Special models by recordId (check these first)
SPECIAL_MODELS = {
    # VEO3
    "8aac94cb-5625-47f4-880c-4f0fd8bd83a1": "KIE_AI_API_KEY_VEO3",
    "a5c2ec16-6294-4588-86b6-7b4182601cda": "KIE_AI_API_KEY_VEO3",
    "6e8a863e-8630-4eef-bdbb-5b41f4c883f9": "KIE_AI_API_KEY_VEO3",
    "f8e9c7a5-9d4b-6f2c-8a1e-5d7b3c9f4a6e": "KIE_AI_API_KEY_VEO3",
    "e9c8b7a6-8d5c-4f3e-9a2f-6d8b5c9e4a7f": "KIE_AI_API_KEY_VEO3",
    # SORA2
    "d7f8c5a3-9b2e-6f4d-8c9a-5e7b3a6d4f8c": "KIE_AI_API_KEY_SORA2",
    "c6e5b4a3-5d2f-1c0e-6a9f-3d5b6c7e4a8f": "KIE_AI_API_KEY_SORA2",
    # Nano Banana
    "c7e9a5f3-8d4b-6f2c-9a1e-5d8b3c7f4a6e": "KIE_AI_API_KEY_NANO_BANANA",
    # Seedream V4
    "d2ffb834-fc59-4c80-bf48-c2cc25281fdd": "KIE_AI_API_KEY_SEEDREAM_V4",
    "a6c8e4f7-9d2b-5f3c-8a6e-7d4b9c5f3a8e": "KIE_AI_API_KEY_SEEDREAM_V4",
}

def process_model_file(file_path):
    """Add use_api_key field to a model file"""
    with open(file_path, 'r') as f:
        content = f.read()

    # Skip if already has use_api_key
    if 'use_api_key:' in content:
        return False

    # Extract provider and contentType
    provider_match = re.search(r'provider:\s*["\'](\w+)["\']', content)
    content_type_match = re.search(r'contentType:\s*["\']([^"\']+)["\']', content)
    record_id_match = re.search(r'recordId:\s*["\']([^"\']+)["\']', content)

    if not provider_match or not content_type_match:
        return False

    provider = provider_match.group(1)
    content_type = content_type_match.group(1)
    record_id = record_id_match.group(1) if record_id_match else None

    # Check if it's a special model first
    if record_id and record_id in SPECIAL_MODELS:
        use_api_key = SPECIAL_MODELS[record_id]
    # Otherwise use the mapping
    elif (provider, content_type) in API_KEY_MAPPING:
        use_api_key = API_KEY_MAPPING[(provider, content_type)]
    else:
        print(f"  ⚠️  No mapping for provider={provider}, contentType={content_type}")
        return False

    # Add use_api_key after contentType line
    new_content = re.sub(
        r'(contentType:\s*["\'][^"\']+["\'],)',
        rf'\1\n  use_api_key: "{use_api_key}",',
        content
    )

    # Also update function calls from contentType to use_api_key
    new_content = re.sub(
        r'MODEL_CONFIG\.contentType\)',
        r'MODEL_CONFIG.use_api_key)',
        new_content
    )

    with open(file_path, 'w') as f:
        f.write(new_content)

    return True

def main():
    models_dir = Path('src/lib/models/locked')
    updated_count = 0
    skipped_count = 0

    for file_path in models_dir.rglob('*.ts'):
        # Skip utility files
        if file_path.name in ['index.ts', 'getKieApiKey.ts', 'getRunwareApiKey.ts', 'ModelFileGenerator.ts']:
            continue

        if process_model_file(file_path):
            print(f"✅ Updated: {file_path}")
            updated_count += 1
        else:
            skipped_count += 1

    print(f"\n📊 Summary:")
    print(f"   Updated: {updated_count} files")
    print(f"   Skipped: {skipped_count} files")

if __name__ == '__main__':
    main()
