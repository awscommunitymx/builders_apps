import React, { Component, ReactNode } from 'react';
import { AwsRumContextType } from './AwsRumProvider';
import { AwsRum } from 'aws-rum-web';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static contextType = React.createContext<AwsRumContextType>(null);

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: React.ErrorInfo): void {
    console.error('recordingError:', error);
    const awsRum = this.context as AwsRum;
    if (awsRum) {
      awsRum.recordError(error);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Something went wrong.</h1>
          <button onClick={() => (window.location.href = '/')}>Clear Error</button>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.contextType = React.createContext<AwsRumContextType>(null);

export default ErrorBoundary;
