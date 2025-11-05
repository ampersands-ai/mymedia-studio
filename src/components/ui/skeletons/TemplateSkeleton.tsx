interface TemplateSkeletonProps {
  count?: number;
}

export function TemplateSkeleton({ count = 1 }: TemplateSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden border-2 border-black rounded-lg">
          {/* Image skeleton with shimmer */}
          <div className="skeleton aspect-square w-full" />
          
          <div className="p-2 space-y-2">
            {/* Title and badge skeleton */}
            <div className="flex items-center justify-between gap-1">
              <div className="skeleton h-4 flex-1" />
              <div className="skeleton h-5 w-12" />
            </div>
            
            {/* Button skeleton */}
            <div className="skeleton h-7 w-full rounded-md" />
          </div>
        </div>
      ))}
    </>
  );
}
