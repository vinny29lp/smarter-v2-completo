export default function CrmLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-slate-200 rounded-xl" />
          <div className="h-4 w-24 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
