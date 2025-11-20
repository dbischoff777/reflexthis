'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary component - Catches React errors and displays fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    
    // In production, you could send this to an error reporting service
    // e.g., Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
          <div className="text-center max-w-md">
            <div className="mb-6 text-6xl">⚠️</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-primary text-glow mb-4">
              Something went wrong
            </h2>
            <p className="text-muted-foreground mb-6">
              The game encountered an unexpected error. Don't worry, your progress is safe!
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-card border border-border rounded-lg text-left">
                <p className="text-xs text-muted-foreground mb-2">Error details:</p>
                <p className="text-sm text-destructive font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleReset}
                className={cn(
                  'px-6 py-3 rounded-full font-bold',
                  'bg-gradient-to-r from-primary via-accent to-secondary',
                  'text-primary-foreground',
                  'hover:shadow-glow transition-all duration-300',
                  'hover:scale-105 active:scale-95',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
                )}
              >
                Try Again
              </button>
              
              <Link
                href="/"
                className={cn(
                  'px-6 py-3 rounded-full font-bold text-center',
                  'border-2 border-border text-foreground',
                  'hover:border-primary/50 hover:bg-card/80',
                  'transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background'
                )}
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

