import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { EdgeLogger } from "../_shared/edge-logger.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerationCompleteRequest {
  generation_id: string;
  user_id: string;
  generation_duration_seconds: number;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const { generation_id, user_id, generation_duration_seconds }: GenerationCompleteRequest = await req.json();
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const logger = new EdgeLogger('notify-generation-complete', requestId, supabase, true);
    logger.info('Processing generation completion', { 
      userId: user_id,
      metadata: { generation_id, duration: generation_duration_seconds } 
    });

    // Get user notification preferences
    const { data: preferences, error: prefError } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (prefError || !preferences) {
      logger.info('No notification preferences found for user, skipping notification', { userId: user_id });
      return new Response(
        JSON.stringify({ success: true, message: "No preferences set" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if duration exceeds threshold
    if (generation_duration_seconds < preferences.notification_threshold_seconds) {
      logger.debug('Generation below notification threshold', { 
        metadata: { 
          duration: generation_duration_seconds, 
          threshold: preferences.notification_threshold_seconds 
        } 
      });
      return new Response(
        JSON.stringify({ success: true, message: "Below threshold" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email notification is enabled
    if (!preferences.email_on_completion) {
      logger.info('Email notifications disabled for this user', { userId: user_id });
      return new Response(
        JSON.stringify({ success: true, message: "Email disabled" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get generation details
    const { data: generation, error: genError } = await supabase
      .from("generations")
      .select("*, ai_models!inner(model_name, provider)")
      .eq("id", generation_id)
      .single();

    if (genError || !generation) {
      throw new Error("Generation not found");
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user_id)
      .single();

    const recipientEmail = profile?.email || "";
    const userName = profile?.full_name || "User";

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "Artifio <noreply@artifio.ai>",
      to: [recipientEmail],
      subject: `✅ Your ${generation.type} is ready!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .preview { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
            .meta { color: #6b7280; font-size: 14px; margin: 10px 0; }
            .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎉 Generation Complete!</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              
              <p>Great news! Your ${generation.type} generation is ready and waiting for you.</p>
              
              <div class="preview">
                <h3 style="margin-top: 0;">Generation Details</h3>
                <p class="meta"><strong>Model:</strong> ${generation.ai_models?.model_name || 'Unknown'}</p>
                <p class="meta"><strong>Provider:</strong> ${generation.ai_models?.provider || 'Unknown'}</p>
                <p class="meta"><strong>Prompt:</strong> ${generation.prompt?.substring(0, 100)}${(generation.prompt?.length || 0) > 100 ? '...' : ''}</p>
                <p class="meta"><strong>Duration:</strong> ${Math.floor(generation_duration_seconds / 60)}m ${generation_duration_seconds % 60}s</p>
                <p class="meta"><strong>Tokens Used:</strong> ${generation.tokens_used || 0}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('/supabase', '')}/history" class="button">
                  View Your Generation
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                You received this email because you enabled completion notifications for generations that take longer than ${preferences.notification_threshold_seconds} seconds.
                You can update your preferences in Settings.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Artifio. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    logger.info('Email sent successfully', { 
      userId: user_id,
      metadata: { 
        generation_id,
        email_id: (emailResponse as any).data?.id || (emailResponse as any).id 
      } 
    });
    logger.logDuration('Notification sent', startTime);

    // Log to generation_notifications
    await supabase.from("generation_notifications").insert({
      user_id,
      generation_id,
      notification_type: "email",
      delivery_status: "sent",
      email_id: (emailResponse as any).data?.id || (emailResponse as any).id
    });

    // Log to email_history
    await supabase.from("email_history").insert({
      user_id,
      recipient_email: recipientEmail,
      email_type: "generation_complete",
      subject: `✅ Your ${generation.type} is ready!`,
      delivery_status: "sent",
      resend_email_id: (emailResponse as any).data?.id || (emailResponse as any).id,
      metadata: {
        generation_id,
        generation_type: generation.type,
        model_id: generation.model_id,
        duration_seconds: generation_duration_seconds
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification sent",
        email_id: (emailResponse as any).data?.id || (emailResponse as any).id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const logger = new EdgeLogger('notify-generation-complete', requestId, supabase, true);
    logger.error('Error sending notification', error as Error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
