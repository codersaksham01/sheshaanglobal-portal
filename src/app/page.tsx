'use client';

import React from 'react';
import { AuthGate } from '../components/AuthGate';
import { Dashboard } from '../components/Dashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <AuthGate>
        <Dashboard />
      </AuthGate>
    </main>
  );
}
