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
import { SystematicLoadingScreen } from './SystematicLoadingScreen';

type PortalIdentity = { email: string; firebaseAuthenticated: boolean };
const PortalIdentityContext = createContext<PortalIdentity>({ email: '', firebaseAuthenticated: false });
export const usePortalIdentity = () => useContext(PortalIdentityContext);

// These accounts are verified directly in Firebase Authentication.  They must
// remain able to sign in if Firestore is temporarily unavailable (for example,
// when the project's daily read quota has been reached) before their directory
// documents can be read.
const leadershipEmails = new Set([
  'info@sheshaanglobal.com',
  'sakshamsingh@sheshaanglobal.com',
  'junedbarade@sheshaanglobal.com',
  'sanazeba@sheshaanglobal.com'
]);

const isLeadershipAccount = (email: string) => leadershipEmails.has(email.trim().toLowerCase());

const isFirebaseNetworkError = (error: unknown) => {
  const code = (error as { code?: string })?.code || '';
  const message = error instanceof Error ? error.message : String(error || '');
  return code === 'auth/network-request-failed' || message.includes('auth/network-request-failed');
};

async function hasActiveSupabaseProfile(userId: string) {
  const { data, error } = await supabase
    .from('app_users')
    .select('id, active')
    .eq('auth_user_id', userId)
    .single();
  return !error && Boolean(data?.active);
}

async function hasActiveFirebaseProfile(email: string) {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('id, active')
      .eq('email', email.toLowerCase())
      .single();
    if (!error) return Boolean(data?.active);
  } catch (error) {
    console.warn('Firebase portal-directory lookup unavailable:', error);
  }

  // Firestore is the directory of record for ordinary users.  The four
  // leadership accounts are additionally verified in Firebase Authentication,
  // so allow them through during a transient Firestore outage/quota block.
  return isLeadershipAccount(email);
}

export const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const [email, setEmail] = useState(defaultFirebaseLoginEmail);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authenticatedEmail, setAuthenticatedEmail] = useState('');
  const [requestMode, setRequestMode] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestRole, setRequestRole] = useState<'Admin' | 'Executive' | 'Sales' | 'Accounts' | 'Operations'>('Sales');
  const [requestPhone, setRequestPhone] = useState('');
  const [requestTitle, setRequestTitle] = useState('');

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

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (user) => {
        void (async () => {
          const userEmail = user?.email || '';
          const profileActive = userEmail ? await hasActiveFirebaseProfile(userEmail) : false;
          setIsAuthenticated(Boolean(user && profileActive));
          setAuthenticatedEmail(profileActive ? userEmail : '');
          if (typeof window !== 'undefined') {
            if (profileActive) localStorage.setItem('crixy_actor_email', userEmail);
            else localStorage.removeItem('crixy_actor_email');
          }
          setChecking(false);
        })();
      },
      (authError) => {
        console.warn('Firebase auth state check failed:', authError);
        if (isFirebaseNetworkError(authError)) {
          fetch('/api/login', { cache: 'no-store' })
            .then((response) => setIsAuthenticated(response.ok))
            .catch(() => setIsAuthenticated(false))
            .finally(() => setChecking(false));
          return;
        }
        setIsAuthenticated(false);
        setChecking(false);
      }
    );

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
        try {
          await setPersistence(firebaseAuth, browserLocalPersistence);
          await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
          if (!(await hasActiveFirebaseProfile(email.trim()))) {
            await signOut(firebaseAuth);
            throw new Error('This account is not active in the portal directory.');
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('crixy_actor_email', email.trim());
          }
          // Sync server-side session cookie in background
          fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
          }).catch(() => {});
          setIsAuthenticated(true);
          return;
        } catch (firebaseError) {
          if (!isFirebaseNetworkError(firebaseError)) throw firebaseError;
          console.warn('Firebase auth unavailable, falling back to local login:', firebaseError);
        }
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

      if (typeof window !== 'undefined') {
        localStorage.setItem('crixy_actor_email', email.trim());
      }
      setAuthenticatedEmail(email.trim());
      setIsAuthenticated(true);
    } catch (err) {
      console.warn('Login error:', err);
      const firebaseCode = (err as { code?: string })?.code || '';
      if (firebaseCode === 'auth/invalid-credential' || firebaseCode === 'auth/wrong-password' || firebaseCode === 'auth/user-not-found') {
        setError('Firebase rejected this email or password. Confirm that you are using info@sheshaanglobal.com and the password was saved in this Firebase project.');
        return;
      }
      setError(isSupabaseConfigured
        ? 'Login failed. Check your email and password or ask an administrator to activate your portal account.'
        : 'Login failed. Check the password and make sure the configured authentication user exists.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccessRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: requestName,
          email,
          password,
          requested_role: requestRole,
          phone: requestPhone,
          title: requestTitle
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not submit access request.');
      setRequestMode(false);
      setPassword('');
      setRequestName('');
      setRequestPhone('');
      setRequestTitle('');
      setError('Access request sent. Main admin must approve it before login.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit access request.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('crixy_actor_email');
        localStorage.removeItem('crixy_actor_name');
      }
      if (isSupabaseConfigured) await supabase.auth.signOut();
      else if (firebaseAuth) await signOut(firebaseAuth);
      await fetch('/api/login', { method: 'DELETE' }).catch(() => {});
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
      <SystematicLoadingScreen
        title="Sheshaan Global"
        subtitle="Verifying session and credentials..."
      />
    );
  }

  if (isAuthenticated) {
    return (
      <>
        <button
          type="button"
          onClick={handleLogout}
          className="fixed bottom-20 right-4 z-20 inline-flex items-center gap-2 rounded-lg bg-slate-900/90 backdrop-blur-sm px-3 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-900 transition sm:bottom-4"
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
    <div className="auth-os min-h-screen flex items-center justify-center p-3 sm:p-4 py-6 sm:py-8 mobile-safe-bottom mobile-safe-top">
      <div className="grid w-full max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-stretch">
        <section className="auth-hero hidden overflow-hidden rounded-[26px] border border-white/10 p-8 text-white shadow-2xl lg:flex lg:flex-col lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-sky-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-200 ring-1 ring-sky-300/15">
              Sheshaan Global · Secure access
            </span>
            <h1 className="mt-5 max-w-xl text-4xl font-black leading-tight tracking-tight">
              Lead global trade operations from one secure workspace.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              A focused command center for CRM, export documentation, finance, logistics, and leadership collaboration.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            {[['SZ', 'Sana Zeba Bakshi', 'Chief Executive Officer'], ['SS', 'Saksham Singh', 'Managing Director'], ['JB', 'Juned Barade', 'Chief Operating Officer']].map(([initials, name, title]) => <div key={initials} className="rounded-2xl border border-white/10 bg-white/10 p-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-200 text-[10px] font-black text-emerald-950">{initials}</span><p className="mt-3 text-[11px] font-black text-white">{name}</p><p className="mt-1 text-[10px] leading-4 text-emerald-100">{title}</p></div>)}
          </div>
        </section>

        <form onSubmit={requestMode ? handleAccessRequest : handleLogin} className="auth-card w-full rounded-2xl p-5 sm:p-7 space-y-4 sm:space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-white text-slate-900 flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm">
              <Image src="/logo.png" alt="Sheshaan Global logo" width={56} height={56} className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Secure Portal Access</p>
              <h1 className="text-lg font-extrabold text-slate-900">Sheshaan Global</h1>
              <p className="text-xs text-slate-500">{requestMode ? 'Request access for your team account.' : 'Commercial operations workspace.'}</p>
            </div>
          </div>

          {requestMode && (
            <>
              <TextAuthInput label="Full Name" value={requestName} onChange={setRequestName} placeholder="Your name" required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextAuthInput label="Designation" value={requestTitle} onChange={setRequestTitle} placeholder="Sales Manager" />
                <label className="block text-sm">
                  <span className="block text-slate-600 font-bold mb-1.5">Requested Role</span>
                  <select
                    value={requestRole}
                    onChange={(event) => setRequestRole(event.target.value as typeof requestRole)}
                    className="w-full h-11 px-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white focus:outline-none"
                  >
                    {['Sales', 'Accounts', 'Operations', 'Executive', 'Admin'].map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </label>
              </div>
              <TextAuthInput label="Phone" value={requestPhone} onChange={setRequestPhone} placeholder="+91..." />
            </>
          )}

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
          placeholder={requestMode ? 'Create a password' : 'Enter your password'}
            className="w-full h-11 px-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white focus:outline-none"
            required
          />
        </label>

        {error && <div className={`text-xs rounded-xl p-3 font-semibold ${error.includes('sent') ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-red-700 bg-red-50 border border-red-100'}`}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-[#073f35] hover:bg-[#087f63] disabled:bg-slate-500 text-white font-black rounded-xl transition flex items-center justify-center gap-2 shadow-[0_18px_42px_rgba(5,47,41,0.20)]"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {requestMode ? 'Request Approval' : 'Login'}
        </button>
        <button
          type="button"
          onClick={() => {
            setRequestMode((value) => !value);
            setError('');
          }}
          className="w-full text-xs font-black text-emerald-700 hover:text-emerald-900"
        >
          {requestMode ? 'Back to login' : 'New team member? Request portal access'}
        </button>
        </form>
      </div>
    </div>
  );
};

const TextAuthInput = ({
  label,
  value,
  onChange,
  placeholder,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) => (
  <label className="block text-sm">
    <span className="block text-slate-600 font-bold mb-1.5">{label}</span>
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full h-11 px-3 border border-slate-200 bg-slate-50 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white focus:outline-none"
      required={required}
    />
  </label>
);
