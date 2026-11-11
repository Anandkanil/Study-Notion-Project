import React from "react";

/**
 * Catches render errors so one broken page never blanks the whole app.
 * `resetKey` (the current path) clears the error when the user navigates away.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unexpected UI error:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div role="alert" className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold text-richblack-5">Something went wrong</h1>
        <p className="text-richblack-200">
          This page hit an unexpected problem. Try again, or go back to the home page.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-yellow-50 px-4 py-2 font-semibold text-richblack-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-50"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md bg-richblack-700 px-4 py-2 font-semibold text-richblack-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-richblack-5"
          >
            Home
          </a>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
