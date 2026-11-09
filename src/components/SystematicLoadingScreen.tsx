'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { RefreshCw } from 'lucide-react';

interface SystematicLoadingScreenProps {
  title?: string;
  subtitle?: string;
  phaseLabel?: string;
  progressPercent?: number;
  onRetry?: () => void;
}

export const SystematicLoadingScreen: React.FC<SystematicLoadingScreenProps> = ({
  title = 'Sheshaan Global',
  subtitle = 'Loading workspace, please wait...',
  phaseLabel,
  progressPercent,
  onRetry
}) => {
  const [isTimedOut, setIsTimedOut] = useState(false);

  // Fallback timeout after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTimedOut(true);
    }, 8000);
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

  const displayText = phaseLabel || subtitle;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading workspace"
      className="fixed inset-0 z-[99999] flex min-h-screen w-screen flex-col items-center justify-center select-none bg-slate-50/95 backdrop-blur-xs text-slate-800 transition-opacity duration-150"
    >
      <div className="flex flex-col items-center px-6 py-8 text-center max-w-sm mx-auto">
        {/* Clean Logo Box */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2.5 shadow-sm border border-slate-200/80">
            <Image
              src="/logo-opt.png"
              alt="Sheshaan Global logo"
              width={48}
              height={48}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        </div>

        {/* Clean Enterprise Typography */}
        <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
          {title}
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
          {displayText}
        </p>

        {/* Slim Minimalist Progress Bar */}
        <div className="mt-5 w-44">
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
            {typeof progressPercent === 'number' ? (
              <div
                className="h-full bg-sky-600 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            ) : (
              <div className="portal-busy-track !mt-0 !h-1 !bg-slate-200">
                <span className="!bg-sky-600" />
              </div>
            )}
          </div>
        </div>

        {/* Subtle Timeout Recovery */}
        {isTimedOut && (
          <div className="mt-6 flex flex-col items-center gap-2 animate-fade-in">
            <p className="text-xs text-slate-500">Taking longer than expected?</p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3 text-slate-500" />
              <span>Reload page</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
