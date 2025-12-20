import { useEffect, useRef, useCallback, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Cloudflare Turnstile Site Key
// Note: Lovable preview domains change frequently. For preview/local we use Cloudflare's test keys
// so verification works reliably during development.
const PROD_TURNSTILE_SITE_KEY = "0x4AAAAAACHj1CN28cJMGuIM";
const DEV_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: (error: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export function TurnstileWidget({ onVerify, onError, onExpire }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;

    // Remove existing widget if any
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (e) {
        // Ignore removal errors
      }
    }

    setIsLoading(false);
    setHasError(false);

    try {
      const hostname = window.location.hostname;
      const isPreviewHost =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.endsWith(".lovable.app") ||
        hostname.endsWith(".lovableproject.com");

      const sitekey = isPreviewHost ? DEV_TURNSTILE_SITE_KEY : PROD_TURNSTILE_SITE_KEY;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey,
        callback: (token: string) => {
          onVerify(token);
        },
        "error-callback": (error: string) => {
          console.error("[Turnstile] Error:", error);
          setHasError(true);
          onError?.(error);
        },
        "expired-callback": () => {
          onExpire?.();
        },
        theme: "auto",
        size: "normal",
      });
    } catch (error) {
      console.error("[Turnstile] Render error:", error);
      setHasError(true);
      onError?.(String(error));
    }
  }, [onVerify, onError, onExpire]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let pollIntervalId: ReturnType<typeof setInterval>;
    
    // Check if script is already loaded
    if (window.turnstile) {
      renderWidget();
      return;
    }

    // Load Turnstile script
    const existingScript = document.querySelector(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    );

    if (!existingScript) {
      const script = document.createElement("script");
      // Explicit rendering mode to ensure window.turnstile is available reliably
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
      script.async = true;
      script.defer = true;

      window.onTurnstileLoad = () => {
        renderWidget();
      };

      script.onerror = () => {
        console.error("[Turnstile] Failed to load script");
        setIsLoading(false);
        setHasError(true);
        onError?.("Failed to load security verification");
      };

      document.head.appendChild(script);
    } else {
      // Script exists - poll for turnstile to be ready
      // This handles the case where script loaded but onTurnstileLoad already fired
      pollIntervalId = setInterval(() => {
        if (window.turnstile) {
          clearInterval(pollIntervalId);
          renderWidget();
        }
      }, 100);
      
      // Also set the callback in case it hasn't fired yet
      window.onTurnstileLoad = () => {
        if (pollIntervalId) clearInterval(pollIntervalId);
        renderWidget();
      };
    }

    // Timeout fallback - if Turnstile doesn't load in 10 seconds, show error
    timeoutId = setTimeout(() => {
      if (pollIntervalId) clearInterval(pollIntervalId);
      if (!window.turnstile) {
        console.error("[Turnstile] Load timeout");
        setIsLoading(false);
        setHasError(true);
        onError?.("Security verification timed out. Please refresh the page.");
      }
    }, 10000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (pollIntervalId) clearInterval(pollIntervalId);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [renderWidget, onError]);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    renderWidget();
  };

  if (hasError) {
    return (
      <div className="flex flex-col items-center gap-2 p-4 border-2 border-destructive/50 rounded-lg bg-destructive/5">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Verification failed</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRetry}
          className="gap-2"
        >
          <RefreshCw className="h-3 w-3" />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      {isLoading && (
        <div className="h-[65px] flex items-center justify-center text-sm text-muted-foreground">
          Loading verification...
        </div>
      )}
      <div ref={containerRef} className={isLoading ? "hidden" : ""} />
    </div>
  );
}
