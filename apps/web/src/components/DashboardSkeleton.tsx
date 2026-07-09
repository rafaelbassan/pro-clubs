export function DashboardSkeleton() {
  return (
    <div aria-busy="true">
      <div className="pc-card mb-5 flex items-center gap-4">
        <div className="skeleton h-16 w-16 rounded-2xl" />
        <div className="flex-1 space-y-2.5">
          <div className="skeleton h-7 w-52" />
          <div className="skeleton h-3.5 w-72" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-[86px]" />
        ))}
      </div>
      <div className="my-5 grid gap-4 lg:grid-cols-5">
        <div className="skeleton h-[380px] lg:col-span-3" />
        <div className="skeleton h-[380px] lg:col-span-2" />
      </div>
      <div className="skeleton h-[320px]" />
    </div>
  );
}
