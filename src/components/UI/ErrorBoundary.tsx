import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-900 pt-16 flex items-center justify-center">
          <div className="text-center text-gray-300 max-w-2xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="mb-6">We encountered an unexpected error. Please try refreshing the page.</p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-gray-800 rounded-lg p-4 mb-6 text-left">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Error Details:</h3>
                <p className="text-red-300 mb-2">{this.state.error.message}</p>
                <details className="text-sm text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-300">Stack Trace</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs">{this.state.error.stack}</pre>
                </details>
                {this.state.errorInfo && (
                  <details className="text-sm text-gray-400 mt-2">
                    <summary className="cursor-pointer hover:text-gray-300">Component Stack</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs">{this.state.errorInfo.componentStack}</pre>
                  </details>
                )}
              </div>
            )}
            
            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 