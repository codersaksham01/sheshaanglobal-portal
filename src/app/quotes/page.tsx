'use client';

import React from 'react';
import { AuthGate } from '../../components/AuthGate';
import { AppErrorBoundary } from '../../components/AppErrorBoundary';
import { Dashboard } from '../../components/Dashboard';

export default function QuotesPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <AuthGate>
        <AppErrorBoundary>
          <Dashboard initialTab="quotes" />
        </AppErrorBoundary>
      </AuthGate>
    </main>
  );
}
