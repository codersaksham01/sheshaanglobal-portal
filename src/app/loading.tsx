import Image from 'next/image';

export default function Loading() {
  return (
    <main className="portal-os min-h-screen" aria-label="Loading portal">
      <div className="portal-busy-overlay">
        <div className="portal-busy-card" role="status" aria-live="polite" aria-label="Loading Sheshaan Global portal">
          <div className="portal-busy-logo-wrap">
            <Image src="/logo.png" alt="Sheshaan Global" width={72} height={72} className="h-full w-full object-contain" priority />
          </div>
          <div className="min-w-0 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-700">Sheshaan Global</p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">Preparing your workspace</h2>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
              Loading buyers, quotations, tasks, shipments, documents, and reports.
            </p>
          </div>
          <div className="portal-busy-status">
            <span className="portal-busy-dot" />
            <span>Secure operating system loading</span>
          </div>
          <div className="portal-busy-track" aria-hidden="true">
            <span />
          </div>
        </div>
      </div>
    </main>
  );
}
