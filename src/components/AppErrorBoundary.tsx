'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type State = { hasError: boolean; error: Error | null };

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Portal render failure:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const errorReference = this.state.error?.message
      ? `ERR-${Math.abs(this.state.error.message.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)).toString(16).toUpperCase()}`
      : 'ERR-PORTAL';
    const canShowDebugDetails = process.env.NODE_ENV !== 'production';

    return (
      <main className="min-h-screen bg-slate-100 p-4 flex items-center justify-center">
        <section className="w-full max-w-2xl rounded-lg border border-red-200 bg-white p-6 shadow-sm" role="alert">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-extrabold text-slate-950">The portal could not render this view</h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">Your data has not been changed. Reload the portal to restore the last saved state.</p>
              <p className="mt-2 text-xs font-bold text-slate-500">Reference: {errorReference}</p>
              
              {canShowDebugDetails && this.state.error && (
                <div className="mt-4 p-3 bg-red-50/50 border border-red-100 rounded text-xs font-mono text-red-800 break-words max-h-60 overflow-y-auto">
                  <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
                  <p className="mt-1 text-[10px] text-red-600 whitespace-pre-wrap">{this.state.error.stack}</p>
                </div>
              )}
            </div>
          </div>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800">
            <RefreshCw className="h-4 w-4" />
            Reload portal
          </button>
        </section>
      </main>
    );
  }
}
