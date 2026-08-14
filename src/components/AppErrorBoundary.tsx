'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type State = { hasError: boolean };

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Portal render failure:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-slate-100 p-4 flex items-center justify-center">
        <section className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-6 shadow-sm" role="alert">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-950">The portal could not render this view</h1>
              <p className="mt-1 text-sm leading-6 text-slate-600">Your data has not been changed. Reload the portal to restore the last saved state.</p>
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
