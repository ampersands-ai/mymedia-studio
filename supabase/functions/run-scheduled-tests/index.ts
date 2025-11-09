import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🕐 Starting scheduled test execution...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get schedules that should run now
    const now = new Date();
    const { data: schedules, error } = await supabase
      .from('model_test_schedules')
      .select('*')
      .eq('is_active', true)
      .or(`next_run_at.is.null,next_run_at.lte.${now.toISOString()}`);

    if (error) throw error;

    if (!schedules || schedules.length === 0) {
      console.log('📭 No schedules to run');
      return new Response(
        JSON.stringify({ success: true, message: 'No schedules due', executed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${schedules.length} schedule(s) to execute`);

    const results = [];
    
    for (const schedule of schedules) {
      console.log(`🧪 Running test for schedule: ${schedule.schedule_name}`);
      
      try {
        // Invoke test-model function
        const { data, error: testError } = await supabase.functions.invoke('test-model', {
          body: {
            modelRecordId: schedule.model_record_id,
            testConfig: schedule.test_config
          }
        });

        // Calculate next run time based on cron expression
        const nextRun = calculateNextRun(schedule.cron_expression, now);

        // Update schedule
        await supabase
          .from('model_test_schedules')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRun.toISOString()
          })
          .eq('id', schedule.id);

        results.push({
          schedule: schedule.schedule_name,
          model_record_id: schedule.model_record_id,
          success: !testError,
          next_run: nextRun.toISOString(),
          error: testError?.message
        });

        console.log(testError ? `❌ Test failed: ${testError.message}` : `✅ Test completed`);

      } catch (scheduleError) {
        console.error(`Error executing schedule ${schedule.schedule_name}:`, scheduleError);
        const errorMsg = scheduleError instanceof Error ? scheduleError.message : 'Unknown error';
        results.push({
          schedule: schedule.schedule_name,
          model_record_id: schedule.model_record_id,
          success: false,
          error: errorMsg
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        executed: schedules.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error running scheduled tests:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Simple cron parser - supports common patterns
function calculateNextRun(cronExpression: string, from: Date): Date {
  const parts = cronExpression.split(' ');
  
  // Handle common patterns
  if (cronExpression === '* * * * *') {
    // Every minute
    return new Date(from.getTime() + 60000);
  } else if (cronExpression === '*/5 * * * *') {
    // Every 5 minutes
    return new Date(from.getTime() + 5 * 60000);
  } else if (cronExpression === '*/15 * * * *') {
    // Every 15 minutes
    return new Date(from.getTime() + 15 * 60000);
  } else if (cronExpression === '*/30 * * * *') {
    // Every 30 minutes
    return new Date(from.getTime() + 30 * 60000);
  } else if (cronExpression === '0 * * * *') {
    // Every hour
    const next = new Date(from);
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  } else if (cronExpression === '0 0 * * *') {
    // Daily at midnight
    const next = new Date(from);
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next;
  }
  
  // Default: 1 hour from now
  return new Date(from.getTime() + 3600000);
}
