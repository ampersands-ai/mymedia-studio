export function TemplateSkeleton() {
  return (
    <div className="brutal-card p-6 space-y-4">
      {/* Image skeleton */}
      <div className="skeleton aspect-video w-full rounded-lg" />
      {/* Title skeleton */}
      <div className="skeleton h-6 w-3/4" />
      {/* Description skeleton */}
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-5/6" />
      {/* Button skeleton */}
      <div className="skeleton h-10 w-32 rounded-lg" />
    </div>
  );
}
