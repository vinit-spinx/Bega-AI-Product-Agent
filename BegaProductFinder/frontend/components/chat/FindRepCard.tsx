'use client';

export default function FindRepCard() {
  return (
    <div className="rounded-lg border border-bega-border-1 bg-white px-5 py-4 max-w-md flex items-start gap-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-bega-bg-1 border border-bega-border-2
                      flex items-center justify-center">
        <svg className="w-4 h-4 text-bega-text-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <div>
        <p className="text-bega-text-1 text-sm font-semibold leading-tight">Representative lookup coming soon</p>
        <p className="text-bega-text-2 text-xs mt-1 leading-relaxed">
          We&apos;re still building local representative coverage. In the meantime, use &ldquo;Connect with
          BEGA Team&rdquo; and a representative will be matched to your region.
        </p>
      </div>
    </div>
  );
}
