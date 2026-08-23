"use client";

/**
 * TelemetryErrorBoundary
 *
 * Catches render errors caused by NaN, null, or malformed telemetry data
 * and displays a recovery UI instead of crashing the entire dashboard.
 *
 * Usage:
 *   <TelemetryErrorBoundary>
 *     <SpeedChart />
 *   </TelemetryErrorBoundary>
 *
 * React Error Boundaries must be class components — there is no hook
 * equivalent for componentDidCatch.
 */

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Optional label shown in the error UI for easier debugging */
  context?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class TelemetryErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // In production, replace console.error with Sentry or similar
    console.error(
      `[TelemetryErrorBoundary] Caught error in ${this.props.context ?? "unknown"}:`,
      error,
      info.componentStack,
    );
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 bg-red-950/20 border border-red-500/30 rounded-lg text-center">
        <AlertTriangle className="w-6 h-6 text-red-400" />
        <div>
          <p className="text-sm font-semibold text-red-300">
            {this.props.context ? `${this.props.context} Error` : "Render Error"}
          </p>
          <p className="text-xs text-red-400/70 mt-1 font-mono max-w-xs truncate">
            {this.state.errorMessage}
          </p>
        </div>
        <button
          onClick={this.handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    );
  }
}
