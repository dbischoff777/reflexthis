export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background text-foreground overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Animated logo video */}
        <video
          className="max-w-[520px] w-[70vw] max-h-[70vh] rounded-xl shadow-2xl shadow-primary/40 border-4 border-primary/60 bg-black/80 object-contain"
          src="/animation/ReflexIconAnimated.mp4"
          autoPlay
          muted
          loop
          playsInline
        />

        {/* Optional subtle vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60" />
      </div>
    </div>
  );
}


