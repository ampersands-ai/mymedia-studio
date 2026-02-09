import { Resend } from "https://esm.sh/resend@2.0.0";
import { EdgeLogger } from "../_shared/edge-logger.ts";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { edgeBrand, brandFrom } from "../_shared/brand.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface CINotificationRequest {
  repository: string;
  branch: string;
  commit: string;
  author: string;
  logsUrl: string;
  status: 'failed' | 'passed';
}

Deno.serve(async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('send-ci-notification', requestId);
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    // Parse request body
    const body: CINotificationRequest = await req.json();

    // Validate required fields
    if (!body.repository || !body.branch || !body.commit || !body.author || !body.logsUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...responseHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info('Sending CI notification email', {
      repository: body.repository,
      branch: body.branch,
      status: body.status,
    });

    // Determine email subject and styling based on status
    const isFailure = body.status === 'failed';
    const subject = isFailure
      ? `❌ CI Failed - ${body.repository}`
      : `✅ CI Passed - ${body.repository}`;

    const statusColor = isFailure ? '#dc2626' : '#16a34a';
    const statusText = isFailure ? 'FAILED' : 'PASSED';

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: brandFrom('CI/CD Bot'),
      to: [edgeBrand.devEmail],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">CI Pipeline ${statusText}</h1>
            </div>

            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Repository:</td>
                  <td style="padding: 8px 0;">${body.repository}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Branch:</td>
                  <td style="padding: 8px 0;"><code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${body.branch}</code></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Commit:</td>
                  <td style="padding: 8px 0;"><code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${body.commit.substring(0, 7)}</code></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600;">Author:</td>
                  <td style="padding: 8px 0;">${body.author}</td>
                </tr>
              </table>

              <div style="margin-top: 20px;">
                <a href="${body.logsUrl}"
                   style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                  View Full Logs →
                </a>
              </div>
            </div>

            <div style="margin-top: 20px; padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>Tip:</strong> Check the logs for details on what failed and how to fix it.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      logger.error('Failed to send CI notification email', error);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: error }),
        { status: 500, headers: { ...responseHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info('CI notification email sent successfully', { emailId: data?.id });

    return new Response(
      JSON.stringify({
        success: true,
        emailId: data?.id,
        message: "CI notification sent"
      }),
      { status: 200, headers: { ...responseHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logger.error('Error in send-ci-notification', error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...responseHeaders, "Content-Type": "application/json" } }
    );
  }
});
