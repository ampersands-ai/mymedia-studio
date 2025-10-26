import { useEffect, useState } from 'react';
import { posthog } from '@/lib/posthog';

/**
 * A/B Testing hook using PostHog feature flags
 * 
 * Example usage:
 * const variant = useABTest('new-cta-design', 'control');
 * 
 * Then in PostHog dashboard, create a feature flag with key 'new-cta-design'
 * and variants: control, variant-a, variant-b
 */
export function useABTest<T extends string>(
  flagKey: string,
  defaultVariant: T
): T {
  const [variant, setVariant] = useState<T>(defaultVariant);

  useEffect(() => {
    if (!posthog.__loaded) {
      return;
    }

    // Get feature flag value
    const featureFlag = posthog.getFeatureFlag(flagKey);
    
    if (featureFlag) {
      setVariant(featureFlag as T);
    }

    // Listen for flag changes
    const handleFlagChange = () => {
      const updatedFlag = posthog.getFeatureFlag(flagKey);
      if (updatedFlag) {
        setVariant(updatedFlag as T);
      }
    };

    posthog.onFeatureFlags(handleFlagChange);
  }, [flagKey, defaultVariant]);

  return variant;
}

/**
 * Boolean feature flag hook
 */
export function useFeatureFlag(flagKey: string, defaultValue = false): boolean {
  const [isEnabled, setIsEnabled] = useState(defaultValue);

  useEffect(() => {
    if (!posthog.__loaded) {
      return;
    }

    const flagValue = posthog.isFeatureEnabled(flagKey);
    setIsEnabled(flagValue ?? defaultValue);

    const handleFlagChange = () => {
      const updatedValue = posthog.isFeatureEnabled(flagKey);
      setIsEnabled(updatedValue ?? defaultValue);
    };

    posthog.onFeatureFlags(handleFlagChange);
  }, [flagKey, defaultValue]);

  return isEnabled;
}

/**
 * Track A/B test conversion
 */
export function trackConversion(testName: string, variant: string, metadata?: Record<string, any>) {
  if (posthog.__loaded) {
    posthog.capture('ab_test_conversion', {
      test_name: testName,
      variant,
      ...metadata,
    });
  }
}
