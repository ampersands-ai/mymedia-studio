/**
 * Single Source of Truth: Database Types
 * 
 * These types are exported directly from the auto-generated database schema.
 * DO NOT create local interface definitions - always import from here.
 * 
 * Industry Standard: Database schema is the source of truth, not manual interfaces.
 */

// Import the auto-generated database types
import type { Database } from "../../../src/integrations/supabase/types.ts";

// Export table row types (single source of truth)
export type GenerationRecord = Database['public']['Tables']['generations']['Row'];
export type VideoJobRecord = Database['public']['Tables']['video_jobs']['Row'];
export type WorkflowExecutionRecord = Database['public']['Tables']['workflow_executions']['Row'];
export type UserSubscriptionRecord = Database['public']['Tables']['user_subscriptions']['Row'];
export type ProfileRecord = Database['public']['Tables']['profiles']['Row'];

// Export table insert types
export type GenerationInsert = Database['public']['Tables']['generations']['Insert'];
export type VideoJobInsert = Database['public']['Tables']['video_jobs']['Insert'];
export type WorkflowExecutionInsert = Database['public']['Tables']['workflow_executions']['Insert'];

// Export table update types
export type GenerationUpdate = Database['public']['Tables']['generations']['Update'];
export type VideoJobUpdate = Database['public']['Tables']['video_jobs']['Update'];
export type WorkflowExecutionUpdate = Database['public']['Tables']['workflow_executions']['Update'];

// Re-export Json type for convenience
export type { Json } from "../../../src/integrations/supabase/types.ts";
export type { Database };
