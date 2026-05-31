export default function ContratosLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-xl" />
          <div className="h-4 w-32 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-9 w-36 bg-slate-200 rounded-xl" />
      </div>
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-28 bg-slate-100 rounded-xl" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-slate-50 px-5 flex items-center gap-4">
            <div className="h-4 w-20 bg-slate-100 rounded" />
            <div className="h-4 w-36 bg-slate-100 rounded" />
            <div className="h-4 w-32 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
