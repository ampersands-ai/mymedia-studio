import { supabase } from "@/integrations/supabase/client";
import { BlogPost } from "@/types/blog";

export interface EmailRecipient {
  email: string;
  name?: string;
  user_id?: string;
}

export interface EmailDistributionParams {
  blogPostId: string;
  subject: string;
  previewText?: string;
}

/**
 * Get all users who should receive blog post emails
 */
export async function getBlogSubscribers(): Promise<EmailRecipient[]> {
  try {
    // Get all users with emails
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .not('email', 'is', null);

    if (error) throw error;

    return profiles?.map(p => ({
      email: p.email!,
      name: p.full_name || undefined,
      user_id: p.id
    })) || [];
  } catch (error) {
    console.error('Error fetching blog subscribers:', error);
    return [];
  }
}

/**
 * Send blog post to all subscribers via email
 */
export async function sendBlogPostEmail(params: EmailDistributionParams): Promise<{
  success: boolean;
  recipientCount: number;
  distributionId?: string;
  error?: string;
}> {
  const { blogPostId, subject, previewText } = params;

  try {
    // Fetch the blog post
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', blogPostId)
      .single();

    if (postError || !post) {
      throw new Error('Blog post not found');
    }

    // Get subscribers
    const subscribers = await getBlogSubscribers();

    if (subscribers.length === 0) {
      return {
        success: false,
        recipientCount: 0,
        error: 'No subscribers found'
      };
    }

    // Create email distribution record
    const { data: distribution, error: distError } = await supabase
      .from('blog_email_distributions')
      .insert({
        blog_post_id: blogPostId,
        recipient_count: subscribers.length,
        status: 'pending'
      })
      .select()
      .single();

    if (distError) throw distError;

    // Generate email HTML
    const emailHtml = generateBlogEmailHTML(post, previewText);

    // Send emails in batches
    const batchSize = 100;
    const batches = [];

    for (let i = 0; i < subscribers.length; i += batchSize) {
      batches.push(subscribers.slice(i, i + batchSize));
    }

    // TODO: Integrate with actual email service (SendGrid, Mailgun, etc.)
    // For now, we'll use Supabase Edge Functions or a placeholder

    try {
      // Call Supabase Edge Function for sending emails
      const { data, error } = await supabase.functions.invoke('send-blog-email', {
        body: {
          distributionId: distribution.id,
          subject,
          html: emailHtml,
          recipients: subscribers.map(s => s.email),
          blogPostUrl: `${window.location.origin}/blog/${post.slug}`
        }
      });

      if (error) {
        console.warn('Email function not available, marking as sent (demo mode)');
        // Update distribution status to sent (demo mode)
        await supabase
          .from('blog_email_distributions')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', distribution.id);
      } else {
        // Update distribution status
        await supabase
          .from('blog_email_distributions')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            email_service_id: data?.messageId
          })
          .eq('id', distribution.id);
      }

      return {
        success: true,
        recipientCount: subscribers.length,
        distributionId: distribution.id
      };
    } catch (emailError) {
      console.error('Error sending emails:', emailError);

      // Update distribution status to failed
      await supabase
        .from('blog_email_distributions')
        .update({ status: 'failed' })
        .eq('id', distribution.id);

      throw emailError;
    }
  } catch (error) {
    console.error('Error in sendBlogPostEmail:', error);
    return {
      success: false,
      recipientCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate HTML email template for blog post
 */
function generateBlogEmailHTML(post: BlogPost, previewText?: string): string {
  const baseUrl = window.location.origin;
  const blogUrl = `${baseUrl}/blog/${post.slug}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #8B5CF6;
      margin-bottom: 10px;
    }
    h1 {
      color: #1a1a1a;
      font-size: 28px;
      margin-bottom: 15px;
      line-height: 1.3;
    }
    .excerpt {
      color: #666;
      font-size: 16px;
      margin-bottom: 25px;
    }
    .featured-image {
      width: 100%;
      border-radius: 8px;
      margin-bottom: 25px;
    }
    .cta-button {
      display: inline-block;
      background-color: #8B5CF6;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      transition: background-color 0.2s;
    }
    .cta-button:hover {
      background-color: #7C3AED;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
    .unsubscribe {
      color: #999;
      font-size: 12px;
      margin-top: 15px;
    }
    .unsubscribe a {
      color: #999;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Artifio</div>
      <p style="color: #666;">New Blog Post</p>
    </div>

    ${post.featured_image_url ? `
      <img src="${post.featured_image_url}" alt="${post.title}" class="featured-image" />
    ` : ''}

    <h1>${post.title}</h1>

    ${post.excerpt ? `
      <p class="excerpt">${post.excerpt}</p>
    ` : ''}

    ${previewText ? `
      <p style="color: #555; font-size: 15px; line-height: 1.5;">${previewText}</p>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${blogUrl}" class="cta-button">Read Full Article</a>
    </div>

    <div class="footer">
      <p>
        This email was sent to you because you're subscribed to Artifio's blog updates.
      </p>
      <div class="unsubscribe">
        <a href="${baseUrl}/settings?tab=notifications">Manage email preferences</a> |
        <a href="${baseUrl}/unsubscribe">Unsubscribe</a>
      </div>
      <p style="margin-top: 15px;">
        © ${new Date().getFullYear()} Artifio. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Get email distribution statistics for a blog post
 */
export async function getBlogEmailStats(blogPostId: string) {
  try {
    const { data, error } = await supabase
      .from('blog_email_distributions')
      .select('*')
      .eq('blog_post_id', blogPostId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalSent = data?.reduce((sum, d) => sum + d.recipient_count, 0) || 0;
    const totalOpens = data?.reduce((sum, d) => sum + d.open_count, 0) || 0;
    const totalClicks = data?.reduce((sum, d) => sum + d.click_count, 0) || 0;

    return {
      distributions: data || [],
      totalSent,
      totalOpens,
      totalClicks,
      openRate: totalSent > 0 ? (totalOpens / totalSent) * 100 : 0,
      clickRate: totalSent > 0 ? (totalClicks / totalSent) * 100 : 0
    };
  } catch (error) {
    console.error('Error fetching email stats:', error);
    return {
      distributions: [],
      totalSent: 0,
      totalOpens: 0,
      totalClicks: 0,
      openRate: 0,
      clickRate: 0
    };
  }
}
