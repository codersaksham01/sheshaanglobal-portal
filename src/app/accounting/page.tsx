'use client';

import React from 'react';
import { AuthGate } from '../../components/AuthGate';
import { AppErrorBoundary } from '../../components/AppErrorBoundary';
import { Dashboard } from '../../components/Dashboard';

export default function AccountingPage() {
  return (
    <main className="min-h-screen bg-white">
      <AuthGate>
        <AppErrorBoundary>
          <Dashboard initialTab="accounting" />
        </AppErrorBoundary>
      </AuthGate>
    </main>
  );
}
