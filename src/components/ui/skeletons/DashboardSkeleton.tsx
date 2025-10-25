export function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-10 w-32 rounded-lg" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="brutal-card p-6 space-y-3">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-8 w-32" />
          </div>
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="brutal-card p-8 space-y-6">
        <div className="skeleton h-8 w-40" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton h-16 w-16 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
