import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getModelConfig } from "../_shared/registry/index.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface GenerationCompleteRequest {
  generation_id: string;
  user_id: string;
  generation_duration_seconds: number;
  type?: 'generation' | 'video_job' | 'storyboard';
  video_topic?: string;
  storyboard_title?: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const { 
      generation_id, 
      user_id, 
      generation_duration_seconds,
      type = 'generation',
      video_topic,
      storyboard_title
    }: GenerationCompleteRequest = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const logger = new EdgeLogger('notify-generation-complete', requestId, supabase, true);
    logger.info('Processing completion notification', { 
      userId: user_id,
      metadata: { generation_id, type, duration: generation_duration_seconds } 
    });

    // Get user notification preferences (optional - in-app notifications always work)
    const { data: preferences } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .single();

    // Default preferences if none set
    const notificationThreshold = preferences?.notification_threshold_seconds ?? 30;
    const emailEnabled = preferences?.email_on_completion ?? false;
    const pushEnabled = preferences?.push_on_completion ?? false;

    // Check if duration exceeds threshold (applies to all notification types)
    if (generation_duration_seconds < notificationThreshold) {
      logger.debug('Generation below notification threshold', { 
        metadata: { 
          duration: generation_duration_seconds, 
          threshold: notificationThreshold 
        } 
      });
      return new Response(
        JSON.stringify({ success: true, message: "Below threshold" }),
        { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, profile_name")
      .eq("id", user_id)
      .single();

    const recipientEmail = profile?.email || "";
    const userName = profile?.profile_name || "Creator";

    let emailSent = false;
    let pushSent = false;
    let emailId: string | null = null;

    // Build email content based on type
    let emailSubject = '';
    let emailContent = '';
    let viewUrl = 'https://artifio.ai/dashboard/history';
    let contentTitle = '';
    let contentDetails = '';

    if (type === 'video_job') {
      emailSubject = `🎬 Your faceless video is ready!`;
      contentTitle = video_topic || 'Your Video';
      viewUrl = 'https://artifio.ai/dashboard/faceless-videos';
      contentDetails = `
        <p class="meta"><strong>Topic:</strong> ${video_topic || 'Faceless Video'}</p>
        <p class="meta"><strong>Type:</strong> Faceless Video</p>
        <p class="meta"><strong>Duration:</strong> ~${Math.floor(generation_duration_seconds / 60)}m ${generation_duration_seconds % 60}s</p>
      `;
    } else if (type === 'storyboard') {
      emailSubject = `📽️ Your storyboard video is complete!`;
      contentTitle = storyboard_title || 'Your Storyboard';
      viewUrl = 'https://artifio.ai/dashboard/storyboard';
      contentDetails = `
        <p class="meta"><strong>Title:</strong> ${storyboard_title || 'Storyboard Video'}</p>
        <p class="meta"><strong>Type:</strong> Storyboard Video</p>
        <p class="meta"><strong>Estimated Duration:</strong> ~${Math.floor(generation_duration_seconds / 60)}m ${generation_duration_seconds % 60}s</p>
      `;
    } else {
      // Default: generation type
      const { data: generation, error: genError } = await supabase
        .from("generations")
        .select("*")
        .eq("id", generation_id)
        .single();

      if (genError || !generation) {
        throw new Error("Generation not found");
      }

      // ADR 007: Get model metadata from registry
      let modelName = 'Unknown';
      let provider = 'Unknown';
      try {
        const modelConfig = await getModelConfig(generation.model_record_id);
        modelName = modelConfig.modelName;
        provider = modelConfig.provider;
      } catch (e) {
        logger.error('Failed to load model from registry', e instanceof Error ? e : new Error(String(e)), {
          metadata: {
            generation_id: generation.id,
            model_record_id: generation.model_record_id
          }
        });
      }

      emailSubject = `✅ Your ${generation.type} is ready!`;
      contentTitle = `${generation.type} Generation`;
      contentDetails = `
        <p class="meta"><strong>Model:</strong> ${modelName}</p>
        <p class="meta"><strong>Provider:</strong> ${provider}</p>
        <p class="meta"><strong>Prompt:</strong> ${generation.prompt?.substring(0, 100)}${(generation.prompt?.length || 0) > 100 ? '...' : ''}</p>
        <p class="meta"><strong>Duration:</strong> ${Math.floor(generation_duration_seconds / 60)}m ${generation_duration_seconds % 60}s</p>
        <p class="meta"><strong>Tokens Used:</strong> ${generation.tokens_used || 0}</p>
      `;
    }

    // Send email notification if enabled
    if (emailEnabled && recipientEmail) {
      const emailResponse = await resend.emails.send({
        from: "Artifio <noreply@artifio.ai>",
        to: [recipientEmail],
        subject: emailSubject,
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
                <h1 style="margin: 0;">🎉 ${type === 'video_job' ? 'Video Ready!' : type === 'storyboard' ? 'Storyboard Complete!' : 'Generation Complete!'}</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${userName}</strong>,</p>
                
                <p>Great news! Your ${type === 'video_job' ? 'faceless video' : type === 'storyboard' ? 'storyboard video' : 'generation'} is ready and waiting for you.</p>
                
                <div class="preview">
                  <h3 style="margin-top: 0;">${contentTitle}</h3>
                  ${contentDetails}
                </div>
                
                <div style="text-align: center;">
                  <a href="${viewUrl}" class="button">
                    View Your ${type === 'video_job' ? 'Video' : type === 'storyboard' ? 'Storyboard' : 'Generation'}
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  You received this email because you enabled completion notifications for generations that take longer than ${notificationThreshold} seconds.
                  You can update your preferences in Settings.
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Artifio. All rights reserved.</p>
                <p style="margin-top: 10px; font-size: 11px; color: #9ca3af;">
                  This is an automated message. Please do not reply to this email.<br>
                  For assistance, contact <a href="mailto:support@artifio.ai" style="color: #667eea;">support@artifio.ai</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      });

      emailId = (emailResponse as any).data?.id || (emailResponse as any).id;
      emailSent = true;

      logger.info('Email sent successfully', { 
        userId: user_id,
        metadata: { 
          generation_id,
          type,
          email_id: emailId 
        } 
      });

      // Log to email_history
      await supabase.from("email_history").insert({
        user_id,
        recipient_email: recipientEmail,
        email_type: `${type}_complete`,
        subject: emailSubject,
        delivery_status: "sent",
        resend_email_id: emailId,
        metadata: {
          generation_id,
          type,
          duration_seconds: generation_duration_seconds,
          video_topic,
          storyboard_title
        }
      });
    }

    // Send push notification if enabled
    if (pushEnabled) {
      try {
        const pushTitle = type === 'video_job' 
          ? '🎬 Video Ready!' 
          : type === 'storyboard' 
            ? '📽️ Storyboard Complete!' 
            : '🎉 Generation Complete!';
        
        const pushBody = type === 'video_job'
          ? `Your faceless video "${video_topic?.substring(0, 50) || 'Video'}${(video_topic?.length || 0) > 50 ? '...' : ''}" is ready!`
          : type === 'storyboard'
            ? `Your storyboard "${storyboard_title?.substring(0, 50) || 'Storyboard'}${(storyboard_title?.length || 0) > 50 ? '...' : ''}" is complete!`
            : `Your generation is ready to view.`;

        const pushResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              user_id,
              title: pushTitle,
              body: pushBody,
              icon: '/icons/icon-192x192.png',
              tag: `${type}-${generation_id}`,
              data: {
                generation_id,
                type,
              },
              url: viewUrl.replace('https://artifio.ai', ''),
            }),
          }
        );

        if (pushResponse.ok) {
          const pushResult = await pushResponse.json();
          pushSent = pushResult.sent > 0;
          logger.info('Push notification sent', {
            userId: user_id,
            metadata: {
              generation_id,
              type,
              sent: pushResult.sent,
            },
          });
        }
      } catch (pushError) {
        logger.error('Failed to send push notification', pushError as Error, {
          userId: user_id,
          metadata: { generation_id, type },
        });
      }
    }

    logger.logDuration('Notifications sent', startTime);

    // Insert in-app notification for the bell icon
    const inAppTitle = type === 'video_job' 
      ? '🎬 Video Ready!' 
      : type === 'storyboard' 
        ? '📽️ Storyboard Complete!' 
        : '✅ Generation Complete!';
    
    const inAppMessage = type === 'video_job'
      ? `Your faceless video "${video_topic?.substring(0, 50) || 'Video'}${(video_topic?.length || 0) > 50 ? '...' : ''}" is ready to view.`
      : type === 'storyboard'
        ? `Your storyboard "${storyboard_title?.substring(0, 50) || 'Storyboard'}${(storyboard_title?.length || 0) > 50 ? '...' : ''}" is complete.`
        : `Your ${contentTitle.toLowerCase()} is ready to view.`;

    const actionUrl = type === 'video_job' 
      ? '/dashboard/faceless-videos'
      : type === 'storyboard'
        ? '/dashboard/storyboard'
        : '/dashboard/history';

    await supabase.from("user_notifications").insert({
      user_id,
      type: `${type}_complete`,
      title: inAppTitle,
      message: inAppMessage,
      action_url: actionUrl,
      metadata: {
        generation_id,
        type,
        duration_seconds: generation_duration_seconds,
        video_topic,
        storyboard_title
      }
    });

    logger.info('In-app notification created', { 
      userId: user_id,
      metadata: { generation_id, type } 
    });

    // Log to generation_notifications (only for standard generations)
    if (type === 'generation') {
      if (emailSent) {
        await supabase.from("generation_notifications").insert({
          user_id,
          generation_id,
          notification_type: "email",
          delivery_status: "sent",
          email_id: emailId
        });
      }

      if (pushSent) {
        await supabase.from("generation_notifications").insert({
          user_id,
          generation_id,
          notification_type: "push",
          delivery_status: "sent"
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notifications sent",
        type,
        email_sent: emailSent,
        push_sent: pushSent,
        email_id: emailId
      }),
      { headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const logger = new EdgeLogger('notify-generation-complete', requestId, supabase, true);
    logger.error('Error sending notification', error as Error);
    return new Response(
      JSON.stringify({ success: false, error: (error as any).message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
