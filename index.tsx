import React, { ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Define Error Boundary Class
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 font-['Space_Grotesk']">
              Something went wrong
            </h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              We encountered an unexpected error. Don't worry, your data might still be safe. Please try refreshing the page.
            </p>
            <div className="p-4 bg-gray-50 rounded-lg text-left mb-6 overflow-hidden">
               <p className="text-xs text-gray-400 font-mono break-words">
                 {this.state.error?.toString()}
               </p>
            </div>
            <button
              onClick={this.handleReload}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);