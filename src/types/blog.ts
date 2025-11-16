// Blog Post Types
export interface BlogPost {
  id: string;
  created_at: string;
  updated_at: string;
  author_id: string;

  // Content
  title: string;
  slug: string;
  content: string;
  excerpt?: string;

  // SEO Fields
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  twitter_card_type?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image_url?: string;

  // Schema.org
  schema_type?: string;
  schema_data?: Record<string, any>;

  // Publishing
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  published_at?: string;
  scheduled_for?: string;

  // Analytics
  view_count: number;
  share_count: number;

  // AI Generation
  ai_generated: boolean;
  generation_prompt?: string;
  topic_prompt?: string;

  // Reading time
  reading_time?: number;

  // Featured
  is_featured: boolean;
  featured_image_url?: string;
}

export interface BlogImage {
  id: string;
  created_at: string;
  blog_post_id: string;
  image_url: string;
  alt_text: string;
  title?: string;
  caption?: string;

  // AI Generation
  model_id?: string;
  generation_id?: string;
  prompt?: string;

  // Position
  position: number;
  is_featured: boolean;
}

export interface BlogBacklink {
  id: string;
  created_at: string;
  blog_post_id: string;
  url: string;
  anchor_text: string;
  rel_attribute?: string;
  is_internal: boolean;
  position?: number;
}

export interface BlogEmailDistribution {
  id: string;
  created_at: string;
  blog_post_id: string;
  sent_at: string;
  recipient_count: number;
  open_count: number;
  click_count: number;
  email_service_id?: string;
  status: 'pending' | 'sent' | 'failed';
}

export interface BlogCategory {
  id: string;
  created_at: string;
  name: string;
  slug: string;
  description?: string;
  meta_description?: string;
  parent_id?: string;
}

export interface BlogTag {
  id: string;
  created_at: string;
  name: string;
  slug: string;
  meta_description?: string;
}

// AI Generation Request/Response Types
export interface GenerateTopicRequest {
  industry?: string;
  keywords?: string[];
  tone?: 'professional' | 'casual' | 'technical' | 'conversational';
  targetAudience?: string;
}

export interface GenerateTopicResponse {
  topics: {
    title: string;
    description: string;
    keywords: string[];
    seoScore: number;
  }[];
}

export interface GenerateBlogRequest {
  topic: string;
  keywords?: string[];
  tone?: 'professional' | 'casual' | 'technical' | 'conversational';
  length?: 'short' | 'medium' | 'long';
  includeImages?: boolean;
  numImages?: number;
  targetAudience?: string;
  internalLinks?: { text: string; url: string }[];
  externalLinks?: { text: string; url: string }[];
}

export interface GenerateBlogResponse {
  title: string;
  content: string;
  excerpt: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string[];
  og_title: string;
  og_description: string;
  twitter_title: string;
  twitter_description: string;
  schema_data: Record<string, any>;
  suggested_images: {
    prompt: string;
    alt_text: string;
    position: number;
  }[];
  backlinks: {
    url: string;
    anchor_text: string;
    is_internal: boolean;
    position: number;
  }[];
  tags: string[];
  reading_time: number;
}

// Form Types
export interface BlogPostFormData {
  title: string;
  content: string;
  excerpt?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  status: BlogPost['status'];
  is_featured?: boolean;
  featured_image_url?: string;
  tags?: string[];
  categories?: string[];
}

export interface SEOMetadata {
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  twitter_card_type?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image_url?: string;
  schema_data?: Record<string, any>;
}
