export function MorphingBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden -z-10">
      <div className="gradient-blob blob-1" />
      <div className="gradient-blob blob-2" />
      <div className="gradient-blob blob-3" />
    </div>
  );
}
