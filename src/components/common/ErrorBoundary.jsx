import React from 'react';
import { logUiError } from '../../utils/logger';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logUiError('react.error_boundary', { message: error?.message, info: String(info?.componentStack || '') });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6 text-sm text-red-700">
          Something went wrong. Refresh the page to continue.
        </div>
      );
    }
    return this.props.children;
  }
}
