import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { logger } from '@/lib/logger';

/**
 * Check if the app is running on a native platform (iOS/Android)
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Get the current platform name
 */
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

/**
 * Check if running on iOS
 */
export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Check if running on Android
 */
export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

/**
 * Check if running on web
 */
export const isWeb = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};

/**
 * Trigger haptic feedback (native only)
 */
export const triggerHaptic = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (!isNativePlatform()) return;
  
  try {
    const impactStyle = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    }[style];
    
    await Haptics.impact({ style: impactStyle });
  } catch (error) {
    logger.warn('Haptic feedback not available', {
      component: 'capacitor-utils',
      operation: 'triggerHaptic',
      style,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Set status bar style
 */
export const setStatusBarStyle = async (style: 'light' | 'dark') => {
  if (!isNativePlatform()) return;
  
  try {
    await StatusBar.setStyle({ 
      style: style === 'light' ? Style.Light : Style.Dark 
    });
  } catch (error) {
    logger.warn('Status bar API not available', {
      component: 'capacitor-utils',
      operation: 'setStatusBarStyle',
      style,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get safe area insets (for devices with notches)
 */
export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 };
  
  const style = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(style.getPropertyValue('--sat') || '0'),
    bottom: parseInt(style.getPropertyValue('--sab') || '0'),
    left: parseInt(style.getPropertyValue('--sal') || '0'),
    right: parseInt(style.getPropertyValue('--sar') || '0'),
  };
};
