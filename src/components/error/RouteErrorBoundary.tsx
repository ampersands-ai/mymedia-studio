import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  routeName: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { routeName } = this.props;
    
    // Log structured error
    logger.error('Route error boundary caught error', error, {
      component: 'RouteErrorBoundary',
      routeName,
      componentStack: errorInfo.componentStack,
      severity: this.classifyErrorSeverity(error),
      operation: 'componentDidCatch'
    });
    
    // Log to PostHog
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('route_error', {
        route_name: routeName,
        error_message: error.message,
        error_stack: error.stack,
        component_stack: errorInfo.componentStack,
      });
    }
    
    // Classify error severity
    const severity = this.classifyErrorSeverity(error);
    
    // Log to database with email alert capability
    this.logErrorToDatabase(error, errorInfo, severity);
    
    this.setState({ errorInfo });
  }

  classifyErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    
    // Critical: Authentication, payment, data loss
    if (message.includes('auth') || message.includes('payment') || message.includes('stripe')) {
      return 'critical';
    }
    
    // High: Data errors, undefined access
    if (message.includes('undefined') || message.includes('null') || message.includes('cannot read')) {
      return 'high';
    }
    
    // Medium: Network issues, timeouts
    if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
      return 'medium';
    }
    
    // Default to medium
    return 'medium';
  }

  async logErrorToDatabase(error: Error, errorInfo: React.ErrorInfo, severity: string) {
    try {
      await supabase.functions.invoke('log-error', {
        body: {
          error_type: 'react_error',
          route_name: this.props.routeName,
          route_path: window.location.pathname,
          error_message: error.message,
          error_stack: error.stack,
          component_stack: errorInfo.componentStack,
          severity,
          user_action: 'Component render/interaction',
          browser_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
          },
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            mobile: window.innerWidth < 768,
          },
          metadata: {
            url: window.location.href,
            referrer: document.referrer,
          }
        }
      });
    } catch (logError) {
      logger.error('Failed to log route error to database', logError as Error, {
        component: 'RouteErrorBoundary',
        routeName: this.props.routeName,
        originalError: error.message,
        operation: 'logErrorToDatabase'
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Something went wrong in {this.props.routeName}</h2>
              <p className="text-muted-foreground">
                We encountered an error on this page. Don't worry, the rest of the app should still work.
              </p>
              {import.meta.env.DEV && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Error details (dev mode)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-4 rounded overflow-auto max-h-48">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button onClick={this.handleReset} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={this.handleGoHome} variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
              <Button onClick={this.handleReload} variant="outline">
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
