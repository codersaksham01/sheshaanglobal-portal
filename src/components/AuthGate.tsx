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
      <div className="auth-os min-h-screen text-white flex items-center justify-center">
        <div className="portal-loader-card">
          <Loader2 className="h-6 w-6 animate-spin text-sky-300" />
          <span className="text-xs font-bold text-slate-300">Opening Sheshaan Trade OS</span>
        </div>
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
    <div className="auth-os min-h-screen flex items-center justify-center p-4">
      <div className="grid w-full max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-stretch">
        <section className="hidden overflow-hidden rounded-2xl border border-white/10 bg-white/8 p-7 text-white shadow-2xl backdrop-blur-xl lg:flex lg:flex-col lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-sky-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-200 ring-1 ring-sky-300/15">
              Smart Trade Operating System
            </span>
            <h1 className="mt-5 max-w-xl text-4xl font-black leading-tight tracking-tight">
              Command every buyer, quote, shipment, and payment from one secure workspace.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Sheshaan Global portal connects CRM, export documentation, payment control, and logistics execution for faster international trade operations.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-white/10 bg-white/8 p-3">
              <p className="text-[10px] font-black uppercase text-slate-400">Pipeline</p>
              <p className="mt-2 text-lg font-black text-white">CRM</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/8 p-3">
              <p className="text-[10px] font-black uppercase text-slate-400">Exports</p>
              <p className="mt-2 text-lg font-black text-white">Docs</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/8 p-3">
              <p className="text-[10px] font-black uppercase text-slate-400">Control</p>
              <p className="mt-2 text-lg font-black text-white">RBAC</p>
            </div>
          </div>
        </section>

        <form onSubmit={handleLogin} className="auth-card w-full rounded-2xl p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-white text-slate-900 flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm">
              <Image src="/logo.png" alt="Sheshaan Global logo" width={56} height={56} className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Secure Portal Access</p>
              <h1 className="text-lg font-extrabold text-slate-900">Sheshaan Global</h1>
              <p className="text-xs text-slate-500">Commercial operations workspace.</p>
            </div>
          </div>

          <label className="block text-sm">
          <span className="block text-slate-600 font-bold mb-1.5">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={defaultFirebaseLoginEmail}
            className="w-full h-11 px-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white focus:outline-none"
            autoFocus
            required
          />
        </label>

        <label className="block text-sm">
          <span className="block text-slate-600 font-bold mb-1.5">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="w-full h-11 px-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white focus:outline-none"
            required
          />
        </label>

        {error && <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl p-3 font-semibold">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-slate-950 hover:bg-slate-800 disabled:bg-slate-500 text-white font-black rounded-xl transition flex items-center justify-center gap-2 shadow-[0_18px_42px_rgba(15,23,42,0.18)]"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Login
        </button>
        </form>
      </div>
    </div>
  );
};
