import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary that catches generation errors and provides recovery
 */
export class GenerationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with full context
    logger.error('Generation error caught by boundary', error, {
      componentStack: errorInfo.componentStack,
    } as any);

    // Send to PostHog if available
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('generation_error_boundary', {
        error: error.message,
        componentStack: errorInfo.componentStack,
      });
    }

    this.setState({ errorInfo });

    // Reset generation state
    this.props.onReset?.();

    // Show user-friendly error
    toast.error('Something went wrong', {
      description: 'We\'ve reset the generation state. Please try again.',
      duration: 5000,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <h2 className="text-lg font-semibold">Generation Error</h2>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Something unexpected happened during generation. We've automatically reset the state.
            </p>

            {this.state.error && (
              <details className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={this.handleReset} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                onClick={this.handleReload} 
                variant="outline"
                className="w-full"
              >
                Reload Page
              </Button>

              <Button 
                onClick={this.handleGoHome} 
                variant="ghost"
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
