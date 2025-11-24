import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getResponseHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { EdgeLogger } from "../_shared/edge-logger.ts";



Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = new EdgeLogger('send-blog-email', requestId);
  const responseHeaders = getResponseHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendApiKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { blogPostId } = await req.json();

    logger.info('Sending blog email distribution', { metadata: { blogPostId } });

    // Fetch blog post with full details
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', blogPostId)
      .eq('status', 'published')
      .single();

    if (postError || !post) {
      throw new Error('Blog post not found or not published');
    }

    // Fetch all user emails
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email')
      .not('email', 'is', null);

    if (profilesError) {
      throw new Error('Failed to fetch user emails');
    }

    const recipients = profiles
      .map(p => p.email)
      .filter((email): email is string => !!email);

    if (recipients.length === 0) {
      throw new Error('No recipients found');
    }

    logger.info('Sending to recipients', { metadata: { recipientCount: recipients.length } });

    // Generate blog URL
    const blogUrl = `${supabaseUrl.replace('https://', 'https://app.')}/blog/${post.slug}`;

    // Create beautiful HTML email
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${post.title}</title>
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .content { padding: 40px 30px; }
        .featured-image { width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px; }
        .title { font-size: 24px; font-weight: bold; color: #1a1a1a; margin: 0 0 15px 0; line-height: 1.4; }
        .excerpt { font-size: 16px; color: #666; line-height: 1.6; margin: 0 0 25px 0; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; }
        .footer { padding: 30px; text-align: center; background: #f9f9f9; color: #888; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✨ New Blog Post from Artifio</h1>
        </div>
        <div class="content">
          ${post.featured_image_url ? `<img src="${post.featured_image_url}" alt="${post.title}" class="featured-image" />` : ''}
          <h2 class="title">${post.title}</h2>
          <p class="excerpt">${post.excerpt || ''}</p>
          <a href="${blogUrl}" class="cta-button">Read Full Article →</a>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Artifio AI. All rights reserved.</p>
          <p style="margin-top: 10px; font-size: 12px;">You're receiving this because you're a valued member of our community.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Send emails in batches (Resend limit: 100 per batch)
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < recipients.length; i += batchSize) {
      batches.push(recipients.slice(i, i + batchSize));
    }

    let totalSent = 0;
    let emailServiceIds: string[] = [];

    for (const batch of batches) {
      try {
        const { data, error } = await resend.batch.send(
          batch.map(email => ({
            from: 'Artifio Blog <blog@artifio.ai>',
            to: [email],
            subject: post.title,
            html: emailHtml,
          }))
        );

        if (error) {
          logger.error('Batch send error', error as Error);
          continue;
        }

        if (data && Array.isArray(data.data)) {
          totalSent += batch.length;
          emailServiceIds.push(...data.data.map((d: { id: string }) => d.id));
        }
      } catch (batchError) {
        logger.error('Error sending batch', batchError instanceof Error ? batchError : new Error(String(batchError)));
      }
    }

    // Record distribution in database
    const { error: insertError } = await supabase
      .from('blog_email_distributions')
      .insert({
        blog_post_id: blogPostId,
        recipient_count: totalSent,
        email_service_id: emailServiceIds[0] || null,
        status: totalSent > 0 ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
      });

    if (insertError) {
      logger.error('Failed to record distribution', insertError as Error);
    }

    logger.info('Email distribution complete', {
      metadata: { totalSent, totalRecipients: recipients.length }
    });

    return new Response(
      JSON.stringify({
        success: true,
        total_recipients: recipients.length,
        sent: totalSent,
        failed: recipients.length - totalSent,
      }),
      {
        status: 200,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error('Error sending blog emails', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
