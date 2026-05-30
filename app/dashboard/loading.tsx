// ⚡ Suspense boundary — exibido enquanto o Server Component do dashboard carrega
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Título skeleton */}
      <div className="h-8 w-64 bg-slate-200 rounded-xl" />
      <div className="h-4 w-40 bg-slate-100 rounded-lg" />

      {/* KPIs grid */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 bg-slate-100 rounded-2xl h-20" />
        ))}
      </div>

      {/* Financeiro */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-100 rounded-2xl h-20" />
        <div className="p-4 bg-slate-100 rounded-2xl h-20" />
      </div>

      {/* Cards inferiores */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-slate-100 rounded-2xl h-48" />
        <div className="bg-slate-100 rounded-2xl h-48" />
      </div>
    </div>
  );
}
