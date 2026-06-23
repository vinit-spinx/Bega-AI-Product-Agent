'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchBrief, type BriefData } from '@/services/insights/insightsV2Service';

export default function ExecutiveBrief() {
  const [data, setData] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    fetchBrief()
      .then(d => { setData(d); animateText(d.text, textRef.current); })
      .catch(() => setData({ text: null, generatedAt: '', cached: false }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-bega-black rounded-2xl p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/50">AI Executive Brief</p>
        </div>
        {data?.cached && (
          <span className="text-[9px] text-white/30">Cached · refreshes hourly</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2.5 animate-pulse">
          {[90, 80, 70].map((w, i) => (
            <div key={i} className="h-3 bg-white/10 rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : data?.text ? (
        <p ref={textRef} className="text-[14px] leading-relaxed text-white/85 font-light">
          {data.text}
        </p>
      ) : (
        <p className="text-[13px] text-white/50 italic">
          No conversation data yet. The AI advisor will generate business insights once users begin interacting with the platform.
        </p>
      )}
    </div>
  );
}

function animateText(text: string | null, el: HTMLElement | null) {
  if (!text || !el) return;
  import('gsap').then(({ gsap }) => {
    const words = el.querySelectorAll('span.word') as NodeListOf<HTMLElement>;
    if (words.length > 0) {
      gsap.from(words, { opacity: 0, y: 5, stagger: 0.02, duration: 0.3, ease: 'power1.out' });
    } else {
      gsap.from(el, { opacity: 0, y: 8, duration: 0.6, ease: 'power2.out' });
    }
  });
}
