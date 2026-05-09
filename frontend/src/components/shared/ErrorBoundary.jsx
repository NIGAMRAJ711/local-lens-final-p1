import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white p-8">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-gray-400 mb-4">{this.state.error?.message}</p>
            <button onClick={() => window.location.reload()} className="bg-green-500 px-4 py-2 rounded-lg font-semibold">
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
