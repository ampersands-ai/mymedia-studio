import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { edgeBrand, brandFrom } from "../_shared/brand.ts";

interface DisputeNotificationPayload {
  generation_id: string;
  user_id: string;
  reason: string;
  refund_amount?: number;
  auto_resolved?: boolean;
  status: string;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('send-dispute-notification', requestId);
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const payload: DisputeNotificationPayload = await req.json();
    const { generation_id, user_id, reason, refund_amount, auto_resolved, status } = payload;

    logger.info('Sending dispute notification', { metadata: { generation_id, status } });

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      logger.warn('RESEND_API_KEY not configured, skipping email');
      return new Response(JSON.stringify({ success: false, reason: 'Email not configured' }), {
        status: 200,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user details
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, display_name')
      .eq('id', user_id)
      .single();

    // Get generation details
    const { data: generation } = await supabaseAdmin
      .from('generations')
      .select('prompt, model_id, tokens_used, created_at, status')
      .eq('id', generation_id)
      .single();

    // Get admin emails
    const { data: adminUsers } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminUsers || adminUsers.length === 0) {
      logger.warn('No admin users found');
      return new Response(JSON.stringify({ success: false, reason: 'No admins to notify' }), {
        status: 200,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      });
    }

    const adminIds = adminUsers.map(a => a.user_id);
    const { data: adminProfiles } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .in('id', adminIds);

    const adminEmails = adminProfiles?.map(p => p.email).filter(Boolean) || [];

    if (adminEmails.length === 0) {
      logger.warn('No admin emails found');
      return new Response(JSON.stringify({ success: false, reason: 'No admin emails' }), {
        status: 200,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' }
      });
    }

    const resend = new Resend(resendApiKey);

    const statusBadge = auto_resolved 
      ? '🟢 Auto-Resolved' 
      : status === 'pending' 
        ? '🟡 Pending Review' 
        : status === 'resolved' 
          ? '🟢 Resolved' 
          : '🔴 ' + status;

    const subject = auto_resolved
      ? `[Auto-Refund] Credit refund processed - ${profile?.email || user_id.slice(0, 8)}`
      : `[Action Required] New credit dispute - ${profile?.email || user_id.slice(0, 8)}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
          .field { margin-bottom: 16px; }
          .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .value { margin-top: 4px; padding: 8px 12px; background: white; border-radius: 4px; border: 1px solid #e5e7eb; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 600; }
          .status-resolved { background: #d1fae5; color: #065f46; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .prompt { white-space: pre-wrap; word-break: break-word; font-family: monospace; font-size: 13px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Credit ${auto_resolved ? 'Refund' : 'Dispute'} Notification</h2>
            <p style="margin: 8px 0 0; opacity: 0.9;">${statusBadge}</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">User</div>
              <div class="value">${profile?.email || 'Unknown'} (${profile?.display_name || 'No name'})</div>
            </div>
            
            <div class="field">
              <div class="label">Generation ID</div>
              <div class="value" style="font-family: monospace; font-size: 12px;">${generation_id}</div>
            </div>
            
            <div class="field">
              <div class="label">Amount</div>
              <div class="value"><strong>${refund_amount || generation?.tokens_used || 'N/A'} credits</strong></div>
            </div>
            
            <div class="field">
              <div class="label">Reason</div>
              <div class="value">${reason}</div>
            </div>
            
            ${generation ? `
            <div class="field">
              <div class="label">Generation Details</div>
              <div class="value">
                <div><strong>Model:</strong> ${generation.model_id || 'Unknown'}</div>
                <div><strong>Status:</strong> ${generation.status}</div>
                <div><strong>Created:</strong> ${new Date(generation.created_at).toLocaleString()}</div>
              </div>
            </div>
            
            <div class="field">
              <div class="label">Prompt</div>
              <div class="value prompt">${(generation.prompt || '').slice(0, 500)}${(generation.prompt?.length || 0) > 500 ? '...' : ''}</div>
            </div>
            ` : ''}
            
            ${!auto_resolved ? `
            <a href="${edgeBrand.appUrl}/admin/token-disputes" class="button">Review in Admin Panel</a>
            ` : ''}
            
            <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">
              This is an automated notification from ${edgeBrand.name}.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to all admins
    const emailResponse = await resend.emails.send({
      from: brandFrom('Notifications'),
      to: adminEmails,
      subject: subject,
      html: emailHtml,
    });

    logger.info('Admin notification sent', { 
      metadata: { 
        emailId: emailResponse.data?.id, 
        recipients: adminEmails.length 
      } 
    });

    return new Response(
      JSON.stringify({ success: true, email_id: emailResponse.data?.id }),
      { status: 200, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Failed to send dispute notification', error as Error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
