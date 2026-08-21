'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') console.error(error);
  }, [error]);

  const errorReference = error.digest || `ERR-${Math.abs(error.message.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)).toString(16).toUpperCase()}`;

  return (
    <main className="min-h-screen bg-slate-100 p-4 flex items-center justify-center">
      <section className="w-full max-w-lg rounded-lg border border-red-200 bg-white p-6 shadow-sm" role="alert">
        <AlertTriangle className="h-6 w-6 text-red-700" />
        <h1 className="mt-3 text-lg font-extrabold text-slate-950">We could not open this page</h1>
        <p className="mt-1 text-sm text-slate-600">Please retry. No unsaved action was submitted.</p>
        <p className="mt-2 text-xs font-bold text-slate-500">Reference: {errorReference}</p>
        <button type="button" onClick={reset} className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </section>
    </main>
  );
}
