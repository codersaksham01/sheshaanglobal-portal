'use client';

import React, { useEffect, useState } from 'react';
import { LockKeyhole, LogOut, Loader2 } from 'lucide-react';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { firebaseAuth, firebaseLoginEmail, isFirebaseConfigured } from '../lib/firebaseClient';

const authStorageKey = 'crixy-authenticated';

export const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const [email, setEmail] = useState(firebaseLoginEmail);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      setIsAuthenticated(window.localStorage.getItem(authStorageKey) === 'true');
      setChecking(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setIsAuthenticated(Boolean(user));
      setChecking(false);
    });

    return unsubscribe;
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isFirebaseConfigured && firebaseAuth) {
        await setPersistence(firebaseAuth, browserLocalPersistence);
        await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
        setIsAuthenticated(true);
        return;
      }

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        setError('Wrong password. Please try again.');
        return;
      }

      window.localStorage.setItem(authStorageKey, 'true');
      setIsAuthenticated(true);
    } catch (err) {
      console.warn('Login error:', err);
      setError('Login failed. Check the password and make sure Firebase Email/Password auth user is created.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (firebaseAuth) {
      await signOut(firebaseAuth);
    }
    window.localStorage.removeItem(authStorageKey);
    setEmail(firebaseLoginEmail);
    setPassword('');
    setIsAuthenticated(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <>
        <button
          type="button"
          onClick={handleLogout}
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-lg hover:bg-slate-800"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Crixy Portal Login</h1>
            <p className="text-xs text-slate-500">Enter password to open the secure app.</p>
          </div>
        </div>

        <label className="block text-sm">
          <span className="block text-slate-600 font-semibold mb-1">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@sheshaanglobal.local"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
            autoFocus
            required
          />
        </label>

        <label className="block text-sm">
          <span className="block text-slate-600 font-semibold mb-1">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
            required
          />
        </label>

        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Login
        </button>
      </form>
    </div>
  );
};
