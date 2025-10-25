export function PricingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Title skeleton */}
      <div className="skeleton h-12 w-80 mx-auto mb-4" />
      <div className="skeleton h-6 w-96 mx-auto mb-12" />

      {/* Pricing cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="brutal-card p-8 space-y-6">
            {/* Plan name */}
            <div className="skeleton h-8 w-32" />
            {/* Price */}
            <div className="skeleton h-16 w-40" />
            {/* Features list */}
            <div className="space-y-3">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="skeleton h-4 w-full" />
              ))}
            </div>
            {/* Button skeleton */}
            <div className="skeleton h-12 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
