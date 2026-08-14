'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import Image from 'next/image';
import { LogOut, Loader2 } from 'lucide-react';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { defaultFirebaseLoginEmail, firebaseAuth, isFirebaseConfigured } from '../lib/firebaseClient';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

type PortalIdentity = { email: string; firebaseAuthenticated: boolean };
const PortalIdentityContext = createContext<PortalIdentity>({ email: '', firebaseAuthenticated: false });
export const usePortalIdentity = () => useContext(PortalIdentityContext);

async function hasActiveSupabaseProfile(userId: string) {
  const { data, error } = await supabase
    .from('app_users')
    .select('id, active')
    .eq('auth_user_id', userId)
    .single();
  return !error && Boolean(data?.active);
}

export const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const [email, setEmail] = useState(defaultFirebaseLoginEmail);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authenticatedEmail, setAuthenticatedEmail] = useState('');

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession()
        .then(async ({ data, error }: any) => {
          if (error) throw error;
          const session = data.session;
          const profileActive = session ? await hasActiveSupabaseProfile(session.user.id) : false;
          if (session && !profileActive) await supabase.auth.signOut();
          setIsAuthenticated(Boolean(session && profileActive));
          setAuthenticatedEmail(profileActive ? session?.user?.email || '' : '');
        })
        .catch((authError: unknown) => {
          console.warn('Supabase session check failed:', authError);
          setIsAuthenticated(false);
        })
        .finally(() => setChecking(false));

      const { data: listener } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
        if (!session) {
          setIsAuthenticated(false);
          setAuthenticatedEmail('');
          setChecking(false);
          return;
        }
        queueMicrotask(async () => {
          const profileActive = await hasActiveSupabaseProfile(session.user.id);
          setIsAuthenticated(profileActive);
          setAuthenticatedEmail(profileActive ? session.user.email || '' : '');
          setChecking(false);
        });
      });
      return () => listener.subscription.unsubscribe();
    }

    if (!isFirebaseConfigured || !firebaseAuth) {
      fetch('/api/login', { cache: 'no-store' })
        .then((response) => setIsAuthenticated(response.ok))
        .catch(() => setIsAuthenticated(false))
        .finally(() => setChecking(false));
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setIsAuthenticated(Boolean(user));
      setAuthenticatedEmail(user?.email || '');
      setChecking(false);
    });

    return unsubscribe;
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        if (!data.user || !(await hasActiveSupabaseProfile(data.user.id))) {
          await supabase.auth.signOut();
          throw new Error('This account is not active in the portal directory.');
        }
        setAuthenticatedEmail(data.user?.email || email.trim());
        setIsAuthenticated(Boolean(data.session));
        return;
      }

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

      setAuthenticatedEmail(email.trim());
      setIsAuthenticated(true);
    } catch (err) {
      console.warn('Login error:', err);
      setError(isSupabaseConfigured
        ? 'Login failed. Check your email and password or ask an administrator to activate your portal account.'
        : 'Login failed. Check the password and make sure the configured authentication user exists.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured) await supabase.auth.signOut();
      else if (firebaseAuth) await signOut(firebaseAuth);
      else await fetch('/api/login', { method: 'DELETE' });
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setAuthenticatedEmail('');
      setEmail(defaultFirebaseLoginEmail);
      setPassword('');
      setIsAuthenticated(false);
    }
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
          className="fixed bottom-24 right-4 z-50 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-lg hover:bg-slate-800 sm:bottom-4"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
        <PortalIdentityContext.Provider value={{ email: authenticatedEmail || email.trim(), firebaseAuthenticated: Boolean(isFirebaseConfigured || isSupabaseConfigured) }}>
          {children}
        </PortalIdentityContext.Provider>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-white text-slate-900 flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm">
            <Image src="/logo.png" alt="Sheshaan Global logo" width={48} height={48} className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Sheshaan Global Login</h1>
            <p className="text-xs text-slate-500">Secure access to your commercial operations workspace.</p>
          </div>
        </div>

        <label className="block text-sm">
          <span className="block text-slate-600 font-semibold mb-1">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={defaultFirebaseLoginEmail}
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
