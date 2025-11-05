interface GallerySkeletonProps {
  count?: number;
}

export function GallerySkeleton({ count = 9 }: GallerySkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden border-2 border-border rounded-lg bg-card">
          {/* Image skeleton with shimmer */}
          <div className="skeleton aspect-square w-full" />
          
          <div className="p-4 space-y-3">
            {/* Title skeleton */}
            <div className="skeleton h-5 w-3/4" />
            
            {/* Metadata skeleton */}
            <div className="flex items-center gap-2">
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-4 w-16" />
            </div>
            
            {/* Actions skeleton */}
            <div className="flex gap-2">
              <div className="skeleton h-8 w-8 rounded-md" />
              <div className="skeleton h-8 w-8 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
