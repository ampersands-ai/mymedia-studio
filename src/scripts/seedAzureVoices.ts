import { supabase } from '@/integrations/supabase/client';

export async function seedAzureVoices() {
  console.log('Starting Azure voices seed...');
  
  try {
    const { data, error } = await supabase.functions.invoke('seed-azure-voices');
    
    if (error) {
      console.error('Error seeding Azure voices:', error);
      throw error;
    }
    
    console.log('Azure voices seeded successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to seed Azure voices:', error);
    throw error;
  }
}
