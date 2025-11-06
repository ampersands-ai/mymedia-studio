-- Fix existing child audio generations with missing output_url
UPDATE generations 
SET output_url = 'https://gzlwkvmivbfcvczoqphq.supabase.co/storage/v1/object/public/generated-content/' || storage_path
WHERE output_url IS NULL 
  AND storage_path IS NOT NULL 
  AND parent_generation_id IS NOT NULL;