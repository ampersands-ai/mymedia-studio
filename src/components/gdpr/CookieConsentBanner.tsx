import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, Cookie, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getArtifioDeviceId } from '@/lib/posthog';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

const CONSENT_STORAGE_KEY = 'artifio_cookie_consent';

interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  timestamp: string;
}

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<Omit<ConsentPreferences, 'timestamp'>>({
    analytics: false,
    marketing: false,
    functional: true, // Always required
  });

  useEffect(() => {
    // Check if consent was already given
    const storedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    
    if (storedConsent) {
      try {
        const parsed: ConsentPreferences = JSON.parse(storedConsent);
        setPreferences({
          analytics: parsed.analytics,
          marketing: parsed.marketing,
          functional: parsed.functional,
        });
        
        // Initialize PostHog if analytics consent was given
        if (parsed.analytics) {
          initializePostHog();
        }
        return; // Don't show banner if consent exists
      } catch (e) {
        logger.error('Failed to parse stored consent', e instanceof Error ? e : new Error(String(e)));
      }
    }
    
    // Check browser DNT setting
    const dnt = navigator.doNotTrack === '1' || (window as any).doNotTrack === '1';
    if (dnt) {
      // Respect DNT, set minimal consent
      const dntConsent: ConsentPreferences = {
        analytics: false,
        marketing: false,
        functional: true,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(dntConsent));
      return;
    }
    
    // Show banner after a short delay
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const initializePostHog = async () => {
    try {
      const { initPostHog } = await import('@/lib/posthog');
      initPostHog();
    } catch (e) {
      logger.error('Failed to initialize PostHog', e instanceof Error ? e : new Error(String(e)));
    }
  };

  const saveConsentToDatabase = async (consent: Omit<ConsentPreferences, 'timestamp'>) => {
    const deviceId = getArtifioDeviceId();
    const consentTypes = ['analytics', 'marketing', 'functional'] as const;
    
    try {
      // Use edge function for secure consent handling with hashing
      const consents = consentTypes.map(type => ({
        consent_type: type,
        consented: consent[type],
      }));

      const { error } = await supabase.functions.invoke('manage-consent', {
        body: {
          action: 'save',
          device_id: deviceId,
          consents,
          user_agent: navigator.userAgent,
        },
      });

      if (error) {
        logger.error('Failed to save consent via edge function', new Error(error.message));
      }
    } catch (e) {
      logger.error('Error saving consent', e instanceof Error ? e : new Error(String(e)));
    }
  };

  const handleAcceptAll = async () => {
    const fullConsent: ConsentPreferences = {
      analytics: true,
      marketing: true,
      functional: true,
      timestamp: new Date().toISOString(),
    };
    
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(fullConsent));
    await saveConsentToDatabase(fullConsent);
    await initializePostHog();
    setIsVisible(false);
  };

  const handleRejectNonEssential = async () => {
    const minimalConsent: ConsentPreferences = {
      analytics: false,
      marketing: false,
      functional: true,
      timestamp: new Date().toISOString(),
    };
    
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(minimalConsent));
    await saveConsentToDatabase(minimalConsent);
    setIsVisible(false);
  };

  const handleSavePreferences = async () => {
    const customConsent: ConsentPreferences = {
      ...preferences,
      timestamp: new Date().toISOString(),
    };
    
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(customConsent));
    await saveConsentToDatabase(preferences);
    
    if (preferences.analytics) {
      await initializePostHog();
    }
    
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6 animate-in slide-in-from-bottom-4 duration-300">
      <Card className="max-w-2xl mx-auto p-4 md:p-6 bg-card/95 backdrop-blur-lg border-border shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="hidden md:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Cookie className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary md:hidden" />
                  Your Privacy Matters
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  We use cookies to enhance your experience and analyze site traffic. 
                  You can customize your preferences below.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRejectNonEssential}
                className="shrink-0 -mt-2 -mr-2"
                aria-label="Close consent banner"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-sm text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
              aria-expanded={showDetails}
              aria-controls="cookie-preferences"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide preferences
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Customize preferences
                </>
              )}
            </button>

            {showDetails && (
              <div 
                id="cookie-preferences"
                className="space-y-3 py-3 border-t border-border animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="functional" className="text-sm font-medium">
                      Essential Cookies
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Required for the website to function. Cannot be disabled.
                    </p>
                  </div>
                  <Switch id="functional" checked disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="analytics" className="text-sm font-medium">
                      Analytics Cookies
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Help us understand how visitors interact with our site.
                    </p>
                  </div>
                  <Switch
                    id="analytics"
                    checked={preferences.analytics}
                    onCheckedChange={(checked) => 
                      setPreferences((prev) => ({ ...prev, analytics: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="marketing" className="text-sm font-medium">
                      Marketing Cookies
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Used to deliver personalized advertisements.
                    </p>
                  </div>
                  <Switch
                    id="marketing"
                    checked={preferences.marketing}
                    onCheckedChange={(checked) => 
                      setPreferences((prev) => ({ ...prev, marketing: checked }))
                    }
                  />
                </div>
              </div>
            )}

            <div className={cn(
              "flex flex-col sm:flex-row gap-2",
              showDetails && "pt-2"
            )}>
              {showDetails ? (
                <Button onClick={handleSavePreferences} className="flex-1">
                  Save Preferences
                </Button>
              ) : (
                <>
                  <Button onClick={handleAcceptAll} className="flex-1">
                    Accept All
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleRejectNonEssential}
                    className="flex-1"
                  >
                    Essential Only
                  </Button>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              By continuing to use this site, you agree to our{' '}
              <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
              {' '}and{' '}
              <a href="/terms" className="text-primary hover:underline">Terms of Service</a>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Export helper to check consent status
export function hasAnalyticsConsent(): boolean {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return false;
    const consent: ConsentPreferences = JSON.parse(stored);
    return consent.analytics === true;
  } catch {
    return false;
  }
}

// Export helper to revoke consent (for settings page)
export function revokeAnalyticsConsent(): void {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      const consent: ConsentPreferences = JSON.parse(stored);
      consent.analytics = false;
      consent.marketing = false;
      consent.timestamp = new Date().toISOString();
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    }
  } catch (e) {
    logger.error('Failed to revoke consent', e instanceof Error ? e : new Error(String(e)));
  }
}
