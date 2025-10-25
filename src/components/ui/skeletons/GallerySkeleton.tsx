export function GallerySkeleton() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Title skeleton */}
      <div className="skeleton h-12 w-64 mx-auto mb-12" />

      {/* Grid of card skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="brutal-card p-6 space-y-4">
            {/* Image skeleton */}
            <div className="skeleton aspect-video w-full rounded-lg" />
            {/* Title skeleton */}
            <div className="skeleton h-6 w-3/4" />
            {/* Description skeleton */}
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
