'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { RefreshCw, Database, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface SystematicLoadingScreenProps {
  title?: string;
  subtitle?: string;
  phaseLabel?: string;
  progressPercent?: number;
  onRetry?: () => void;
}

const SYSTEMATIC_PHASES = [
  'Phase 1: Establishing encrypted connection to database...',
  'Phase 2: Synchronizing global buyers, CRM pipelines & leads...',
  'Phase 3: Loading commercial export quotations & product catalog...',
  'Phase 4: Calibrating currency exchange rates & port logistics...',
  'Phase 5: Finalizing secure enterprise workspace...'
];

export const SystematicLoadingScreen: React.FC<SystematicLoadingScreenProps> = ({
  title = 'Initializing Sheshaan Global Portal',
  subtitle = 'Synchronizing buyers, export quotations, shipments, and live trade data...',
  phaseLabel,
  progressPercent,
  onRetry
}) => {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [dots, setDots] = useState('');

  // Systematic phase rotation loop
  useEffect(() => {
    if (phaseLabel) return;
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % SYSTEMATIC_PHASES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [phaseLabel]);

  // Animated ellipsis loop
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 450);
    return () => clearInterval(dotInterval);
  }, []);

  // Timeout warning after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTimedOut(true);
    }, 8500);
    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    if (onRetry) {
      setIsTimedOut(false);
      onRetry();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const currentPhase = phaseLabel || SYSTEMATIC_PHASES[phaseIndex];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Sheshaan Global Database and Workspace"
      className="fixed inset-0 z-[99999] flex min-h-screen w-screen flex-col items-center justify-center select-none overflow-hidden bg-[#050b14] text-white"
    >
      {/* Background Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[25%] left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-sky-500/15 blur-[120px]" />
        <div className="absolute -bottom-[20%] right-[10%] h-[400px] w-[400px] rounded-full bg-indigo-500/12 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04]" />
      </div>

      {/* Main Systematic Card */}
      <div className="relative z-10 flex flex-col items-center px-6 py-8 text-center max-w-lg mx-auto">
        {/* Orbital Center Logo with Radar Spin */}
        <div className="relative mb-7 flex items-center justify-center">
          {/* Outer dashed spinning orbit */}
          <div className="absolute h-32 w-32 rounded-full border border-dashed border-sky-400/30 animate-[slow-spin_14s_linear_infinite]" />
          
          {/* Middle counter-rotating accent ring */}
          <div className="absolute h-28 w-28 rounded-full border border-sky-500/20 animate-[slow-spin_7s_linear_infinite_reverse]" />
          
          {/* Pulsing ambient glow behind logo */}
          <div className="absolute h-24 w-24 rounded-full bg-gradient-to-tr from-sky-500/25 to-indigo-500/25 blur-xl animate-pulse" />

          {/* Orbiting Satellite Node */}
          <div className="absolute h-32 w-32 animate-[slow-spin_14s_linear_infinite] pointer-events-none">
            <span className="absolute top-0 left-1/2 -ml-1.5 -mt-1.5 h-3 w-3 rounded-full bg-sky-400 shadow-[0_0_12px_#38bdf8]" />
          </div>

          {/* Logo Card */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2.5 shadow-[0_10px_40px_rgba(14,165,233,0.35)] ring-1 ring-white/20 transition-transform duration-500 hover:scale-105">
            <Image
              src="/logo-opt.png"
              alt="Sheshaan Global"
              width={76}
              height={76}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        </div>

        {/* Corporate Title & Meta */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-sky-300 backdrop-blur-md">
            <ShieldCheck className="h-3 w-3 text-sky-400" />
            <span>Sheshaan Global • Secure Trade OS</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm pt-1">
            {title}
          </h2>

          <p className="text-xs font-medium leading-relaxed text-slate-400 max-w-sm mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Systematic Animated Progress Bar */}
        <div className="mt-7 w-full max-w-[280px] sm:max-w-[320px]">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
            {typeof progressPercent === 'number' ? (
              <div
                className="h-full bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            ) : (
              <div className="portal-busy-track h-full w-full">
                <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400" />
              </div>
            )}
          </div>

          {/* Dynamic Systematic Phase Text */}
          <div className="mt-3.5 flex items-center justify-center min-h-[22px]">
            <p className="text-[11px] font-bold text-sky-300/90 tracking-wide transition-opacity duration-300">
              {currentPhase}
              <span className="inline-block w-4 text-left">{dots}</span>
            </p>
          </div>
        </div>

        {/* Live Database Engine Status Pill */}
        <div className="mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-[10px] font-bold tracking-wider text-slate-300 backdrop-blur-sm">
          <span className="portal-busy-dot" />
          <Database className="h-3 w-3 text-sky-400" />
          <span>DATABASE SYNCHRONIZING</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400 font-black">ENCRYPTED</span>
        </div>

        {/* Timeout / Retry Prompt */}
        {isTimedOut && (
          <div className="mt-6 flex flex-col items-center gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3.5 backdrop-blur-md animate-[fade-up_200ms_ease-out]">
            <p className="text-[11px] font-semibold text-amber-200">
              Database is taking a little longer to respond.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-1.5 text-xs font-black text-white shadow-lg transition hover:bg-sky-400 active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Database Connection</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
