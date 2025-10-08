import { supabase } from "@/integrations/supabase/client";

export async function failStuckGenerations() {
  const generationIds = [
    '7b49f6fe-eeee-42ca-b60b-85640754a19e',
    'f2a7d2b2-9624-4fbd-a5ae-5b60d6b431f9',
    '6bc0d4f7-32f9-4455-af28-df8ca1995036'
  ];

  const { data, error } = await supabase.functions.invoke('manual-fail-generations', {
    body: { generation_ids: generationIds }
  });

  if (error) {
    console.error('Failed to manually fail generations:', error);
    return { success: false, error };
  }

  console.log('Successfully failed stuck generations:', data);
  return { success: true, data };
}

// Auto-execute
failStuckGenerations();
