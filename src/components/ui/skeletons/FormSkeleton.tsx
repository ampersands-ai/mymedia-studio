export function FormSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Form fields */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="skeleton h-5 w-32" />
          <div className="skeleton h-12 w-full rounded-lg" />
        </div>
      ))}

      {/* Textarea */}
      <div className="space-y-2">
        <div className="skeleton h-5 w-40" />
        <div className="skeleton h-32 w-full rounded-lg" />
      </div>

      {/* Submit button */}
      <div className="skeleton h-12 w-40 rounded-lg" />
    </div>
  );
}
