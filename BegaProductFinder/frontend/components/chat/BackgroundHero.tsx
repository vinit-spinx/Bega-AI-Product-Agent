// Decorative architectural background — purely visual, no interactive elements.
// Swap the src URL for a project-specific image if needed.
export default function BackgroundHero() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Base image — near-invisible at 6% opacity, full grayscale */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1920&q=70"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.06, filter: 'grayscale(100%)' }}
      />

      {/* Gradient overlay preserving full readability of the hero content */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(247,247,246,0.95), rgba(247,247,246,0.98))',
        }}
      />
    </div>
  );
}
