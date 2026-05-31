export default function EmpresasLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-slate-200 rounded-xl" />
          <div className="h-4 w-28 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-xl" />
      </div>
      <div className="h-12 bg-slate-100 rounded-2xl" />
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-slate-50 px-5 flex items-center gap-4">
            <div className="h-4 w-48 bg-slate-100 rounded" />
            <div className="h-4 w-28 bg-slate-100 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
