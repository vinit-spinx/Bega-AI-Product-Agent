interface Props {
  title: string;
  description: string;
  backgroundImageUrl: string;
}

export default function HeroPreview({ title, description, backgroundImageUrl }: Props) {
  return (
    <div className="sticky top-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-bega-text-3 mb-3">
        Live Preview
      </p>

      <div className="rounded-2xl border border-bega-border-1 overflow-hidden shadow-sm">
        {/* Label bar */}
        <div className="bg-bega-bg-2 border-b border-bega-border-1 px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-bega-border-2" />
            <span className="w-2.5 h-2.5 rounded-full bg-bega-border-2" />
            <span className="w-2.5 h-2.5 rounded-full bg-bega-border-2" />
          </div>
          <span className="text-[10px] text-bega-text-3 ml-1">/chat — Hero Section</span>
        </div>

        {/* Hero mockup */}
        <div className="relative bg-bega-bg-1 flex flex-col items-center justify-center px-8 py-10 min-h-[260px]">
          {/* Background image */}
          {backgroundImageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={backgroundImageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: 0.06, filter: 'grayscale(100%)' }}
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(247,247,246,0.95), rgba(247,247,246,0.98))' }}
              />
            </>
          )}

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-8 h-px bg-bega-border-3 mb-4" />

            <h2
              className="font-serif text-[18px] font-medium text-bega-text-1 tracking-tight text-center leading-snug mb-2 transition-all"
              style={{ minHeight: '1.4em' }}
            >
              {title || (
                <span className="text-bega-text-3 italic text-[14px]">Hero title will appear here</span>
              )}
            </h2>

            <p className="text-[8.5px] text-bega-text-3 tracking-[0.18em] uppercase text-center max-w-xs leading-relaxed transition-all">
              {description || (
                <span className="italic normal-case tracking-normal text-[11px]">
                  Description will appear here
                </span>
              )}
            </p>

            {/* Simulated search bar */}
            <div className="mt-5 w-full max-w-[260px] h-9 rounded-xl bg-white border border-bega-border-2 shadow-sm flex items-center px-3 gap-2">
              <svg viewBox="0 0 16 16" fill="none" stroke="#BBBBB6" strokeWidth={1.4} className="w-3.5 h-3.5 flex-shrink-0">
                <circle cx="7" cy="7" r="4.5" />
                <path d="M11 11l2.5 2.5" />
              </svg>
              <span className="text-[10px] text-bega-text-3">Ask about BEGA products…</span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-bega-text-3 mt-2.5 text-center">
        Preview updates as you type
      </p>
    </div>
  );
}
