/**
 * Supabase type overrides
 * Fixes type mismatches in auto-generated types.ts
 */

import type { Database } from '@/integrations/supabase/types';

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    from<T extends keyof Database['public']['Tables']>(
      table: T
    ): {
      insert(data: any): any;
      update(data: any): any;
      select(query?: string): any;
      delete(): any;
      eq(column: string, value: unknown): any;
      in(column: string, values: unknown[]): any;
      [key: string]: any;
    };
  }
}
