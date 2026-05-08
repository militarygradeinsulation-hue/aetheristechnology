import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  label?: string;
}
interface State { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`, error, info);
  }
  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <p className="font-semibold mb-1">Something failed to render here.</p>
          <p className="opacity-80 break-all">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-2 underline hover:opacity-80"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
