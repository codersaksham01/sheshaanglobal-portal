export default function Loading() {
  return (
    <main className="portal-os min-h-screen overflow-hidden p-4 lg:p-6" aria-label="Loading portal">
      <div className="fixed inset-x-0 top-0 z-20 h-1 overflow-hidden bg-slate-900/10">
        <div className="h-full w-1/2 animate-loading-bar bg-sky-400 shadow-[0_0_22px_rgba(56,189,248,0.9)]" />
      </div>
      <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[304px_minmax(0,1fr)]">
        <aside className="portal-sidebar hidden h-[calc(100vh-48px)] overflow-hidden rounded-2xl p-4 lg:block">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/95 skeleton" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-36 rounded bg-white/20" />
              <div className="h-2 w-24 rounded bg-sky-300/20" />
            </div>
          </div>
          <div className="space-y-5">
            {[0, 1, 2].map((group) => (
              <div key={group} className="space-y-2">
                <div className="h-2 w-16 rounded bg-white/10" />
                {[0, 1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-9 rounded-lg bg-white/[0.055]" />
                ))}
              </div>
            ))}
          </div>
        </aside>
        <div className="space-y-4">
          <div className="portal-topbar h-20 overflow-hidden p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl skeleton" />
                <div className="space-y-2">
                  <div className="h-3 w-44 skeleton" />
                  <div className="h-2 w-28 skeleton" />
                </div>
              </div>
              <div className="hidden h-10 w-96 rounded-lg skeleton md:block" />
            </div>
          </div>
          <section className="smart-hero min-h-48 overflow-hidden p-5 text-white">
            <div className="max-w-2xl space-y-4">
              <div className="portal-loader-card">
                <span className="h-3 w-3 rounded-full bg-sky-300 portal-live-dot" />
                <span className="text-xs font-black uppercase tracking-wider text-sky-100">Preparing Smart Trade OS</span>
              </div>
              <div className="h-8 w-80 max-w-full rounded bg-white/12" />
              <div className="h-3 w-full max-w-xl rounded bg-white/10" />
              <div className="h-3 w-4/5 max-w-lg rounded bg-white/10" />
            </div>
          </section>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((item) => <div key={item} className="metric-tile h-28 skeleton" />)}
          </div>
          <div className="portal-workspace h-96 overflow-hidden p-5">
            <div className="mb-5 h-4 w-56 skeleton" />
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-12 rounded-lg skeleton" />)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
