/**
 * Type-safe Google Analytics definitions
 * 
 * Provides complete type safety for Google Analytics 4 integration,
 * eliminating `any` types in analytics tracking.
 */

/**
 * Google Analytics event parameters
 */
export interface GTagEventParams {
  event_category?: string;
  event_label?: string;
  value?: number;
  page_path?: string;
  page_title?: string;
  page_location?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Google Analytics configuration parameters
 */
export interface GTagConfigParams {
  page_path?: string;
  page_title?: string;
  page_location?: string;
  send_page_view?: boolean;
  cookie_domain?: string;
  cookie_flags?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Google Analytics command types
 */
export type GTagCommand = 'config' | 'event' | 'set' | 'consent' | 'js';

/**
 * Google Analytics data layer entry
 */
export type DataLayerEntry = 
  | [GTagCommand, ...unknown[]]
  | Record<string, unknown>;

/**
 * Google Tag function signature
 */
export interface GTagFunction {
  (command: 'config', targetId: string, config?: GTagConfigParams): void;
  (command: 'event', eventName: string, params?: GTagEventParams): void;
  (command: 'set', params: Record<string, unknown>): void;
  (command: 'js', date: Date): void;
  (command: GTagCommand, ...args: unknown[]): void;
}

/**
 * Window interface with Google Analytics
 */
export interface WindowWithAnalytics extends Window {
  dataLayer: DataLayerEntry[];
  gtag: GTagFunction;
}

/**
 * Type guard to check if window has gtag
 */
export function hasGTag(win: Window): win is WindowWithAnalytics {
  return 'gtag' in win && typeof (win as WindowWithAnalytics).gtag === 'function';
}

/**
 * Type guard to check if window has dataLayer
 */
export function hasDataLayer(win: Window): win is WindowWithAnalytics {
  return 'dataLayer' in win && Array.isArray((win as WindowWithAnalytics).dataLayer);
}
