import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export async function seedAzureVoices() {
  logger.info('Starting Azure voices seed', {
    component: 'seedAzureVoices',
    operation: 'seed'
  });
  
  try {
    const { data, error } = await supabase.functions.invoke('seed-azure-voices');
    
    if (error) {
      logger.error('Error seeding Azure voices', error as Error, {
        component: 'seedAzureVoices',
        operation: 'invoke'
      });
      throw error;
    }
    
    logger.info('Azure voices seeded successfully', {
      component: 'seedAzureVoices',
      operation: 'seed',
      data
    });
    return data;
  } catch (error) {
    logger.error('Failed to seed Azure voices', error as Error, {
      component: 'seedAzureVoices',
      operation: 'seed'
    });
    throw error;
  }
}
