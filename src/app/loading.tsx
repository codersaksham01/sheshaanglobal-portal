export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-100 p-4 lg:p-6" aria-label="Loading portal">
      <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[264px_minmax(0,1fr)]">
        <div className="hidden h-[calc(100vh-48px)] animate-pulse rounded-lg bg-slate-900 lg:block" />
        <div className="space-y-4">
          <div className="h-16 animate-pulse rounded-lg border border-slate-200 bg-white" />
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white" />)}
          </div>
          <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
        </div>
      </div>
    </main>
  );
}
