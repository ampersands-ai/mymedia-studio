import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { edgeBrand } from '../_shared/brand.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = edgeBrand.appUrl;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[sitemap] Generating dynamic sitemap...');

    // Fetch all published model pages
    const { data: modelPages, error: modelError } = await supabase
      .from('model_pages')
      .select('slug, updated_at, category')
      .eq('is_published', true)
      .order('display_order', { ascending: true });

    if (modelError) {
      console.error('[sitemap] Error fetching model pages:', modelError);
    }

    // Fetch all published template landing pages
    const { data: templates, error: templateError } = await supabase
      .from('template_landing_pages')
      .select('slug, category_slug, updated_at')
      .eq('is_published', true)
      .order('display_order', { ascending: true });

    if (templateError) {
      console.error('[sitemap] Error fetching templates:', templateError);
    }

    // Fetch all published blog posts
    const { data: blogPosts, error: blogError } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (blogError) {
      console.error('[sitemap] Error fetching blog posts:', blogError);
    }

    // Build XML sitemap
    const today = new Date().toISOString().split('T')[0];
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Static Pages -->
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/pricing</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/models</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/templates</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/playground</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/auth</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${SITE_URL}/privacy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${SITE_URL}/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;

    // Add model pages
    if (modelPages && modelPages.length > 0) {
      xml += `\n  <!-- Model Pages (${modelPages.length} total) -->`;
      for (const model of modelPages) {
        const lastmod = model.updated_at 
          ? new Date(model.updated_at).toISOString().split('T')[0] 
          : today;
        xml += `
  <url>
    <loc>${SITE_URL}/models/${model.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }

    // Add template landing pages
    if (templates && templates.length > 0) {
      xml += `\n  <!-- Template Pages (${templates.length} total) -->`;
      for (const template of templates) {
        const lastmod = template.updated_at 
          ? new Date(template.updated_at).toISOString().split('T')[0] 
          : today;
        xml += `
  <url>
    <loc>${SITE_URL}/templates/${template.category_slug}/${template.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    }

    // Add blog posts
    if (blogPosts && blogPosts.length > 0) {
      xml += `\n  <!-- Blog Posts (${blogPosts.length} total) -->`;
      for (const post of blogPosts) {
        const lastmod = post.updated_at 
          ? new Date(post.updated_at).toISOString().split('T')[0] 
          : post.published_at 
            ? new Date(post.published_at).toISOString().split('T')[0]
            : today;
        xml += `
  <url>
    <loc>${SITE_URL}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    }

    xml += `\n</urlset>`;

    const totalUrls = 9 + (modelPages?.length || 0) + (templates?.length || 0) + (blogPosts?.length || 0);
    console.log(`[sitemap] Generated sitemap with ${totalUrls} URLs`);

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('[sitemap] Error generating sitemap:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`,
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml',
        },
        status: 200,
      }
    );
  }
});
