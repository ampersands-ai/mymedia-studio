
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("🔍 Starting model health check...");

    // Get all active alert configurations
    const { data: configs, error: configError } = await supabase
      .from("model_alert_configs")
      .select("*")
      .eq("email_enabled", true);

    if (configError) {
      console.error("Error fetching alert configs:", configError);
      throw configError;
    }

    if (!configs || configs.length === 0) {
      console.log("No active alert configurations found");
      return new Response(
        JSON.stringify({ message: "No active configurations", checked: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${configs.length} active alert configurations`);
    const alerts: any[] = [];

    // Check each configuration
    for (const config of configs) {
      const windowStart = new Date(Date.now() - config.time_window_minutes * 60 * 1000);
      
      // Get generations in the time window for this model
      const { data: generations, error: genError } = await supabase
        .from("generations")
        .select("status")
        .eq("model_id", config.model_id)
        .gte("created_at", windowStart.toISOString());

      if (genError) {
        console.error(`Error fetching generations for model ${config.model_id}:`, genError);
        continue;
      }

      if (!generations || generations.length === 0) {
        console.log(`No generations found for model ${config.model_id} in the time window`);
        continue;
      }

      const totalCount = generations.length;
      const failedCount = generations.filter(g => g.status === 'failed' || g.status === 'error').length;
      const failureRate = (failedCount / totalCount) * 100;

      console.log(`Model ${config.model_id}: ${failedCount}/${totalCount} failed (${failureRate.toFixed(2)}%)`);

      // Check if failure rate exceeds threshold
      if (failureRate >= config.threshold_percentage) {
        console.log(`⚠️ ALERT: Model ${config.model_id} exceeded threshold (${config.threshold_percentage}%)`);
        
        // Check if we already sent an alert for this time period (avoid spam)
        const { data: recentAlerts } = await supabase
          .from("model_alert_history")
          .select("id")
          .eq("config_id", config.id)
          .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
          .limit(1);

        if (recentAlerts && recentAlerts.length > 0) {
          console.log(`Skipping alert - already sent within last hour`);
          continue;
        }

        // Create alert history record
        const { data: alertHistory, error: historyError } = await supabase
          .from("model_alert_history")
          .insert({
            config_id: config.id,
            model_id: config.model_id,
            failure_rate: failureRate,
            failed_count: failedCount,
            total_count: totalCount,
            time_window_start: windowStart.toISOString(),
            time_window_end: new Date().toISOString(),
            email_sent: false,
          })
          .select()
          .single();

        if (historyError) {
          console.error("Error creating alert history:", historyError);
          continue;
        }

        // Get user email and profile info
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", config.user_id)
          .single();

        const recipientEmail = config.recipient_email || profile?.email;

        if (recipientEmail) {
          // Send alert email
          try {
            const emailResponse = await supabase.functions.invoke("send-model-alert", {
              body: {
                to: recipientEmail,
                userName: profile?.full_name || "User",
                modelId: config.model_id,
                failureRate: failureRate.toFixed(2),
                failedCount,
                totalCount,
                threshold: config.threshold_percentage,
                timeWindow: config.time_window_minutes,
              },
            });

            if (emailResponse.error) {
              console.error("Error sending alert email:", emailResponse.error);
            } else {
              console.log(`✅ Alert email sent to ${recipientEmail}`);
              
              // Update history to mark email as sent
              await supabase
                .from("model_alert_history")
                .update({ email_sent: true })
                .eq("id", alertHistory.id);

              alerts.push({
                model_id: config.model_id,
                failure_rate: failureRate,
                email_sent: true,
              });
            }
          } catch (emailError) {
            console.error("Error invoking email function:", emailError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: configs.length,
        alerts_triggered: alerts.length,
        alerts,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in check-model-health:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
