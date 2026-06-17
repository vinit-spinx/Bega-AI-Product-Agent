'use client';
import { useState, useEffect } from 'react';
import { fetchOpportunities, fetchNetwork, type OpportunityData, type NetworkData } from '@/services/insights/insightsV2Service';
import OpportunityCard from '../widgets/OpportunityCard';
import NetworkGraph from '../widgets/NetworkGraph';
import { useGSAPEntrance } from '@/hooks/useGSAPEntrance';

const EMPTY_NETWORK: NetworkData = { nodes: [], edges: [] };

export default function OpportunityCenterTab() {
  const [oppData, setOppData]       = useState<OpportunityData | null>(null);
  const [netData, setNetData]       = useState<NetworkData>(EMPTY_NETWORK);
  const [loading, setLoading]       = useState(true);
  const [netLoading, setNetLoading] = useState(true);

  const cardsRef = useGSAPEntrance(0.06, [loading]);

  useEffect(() => {
    fetchOpportunities()
      .then(setOppData)
      .catch(() => setOppData(null))
      .finally(() => setLoading(false));

    fetchNetwork()
      .then(setNetData)
      .catch(() => setNetData(EMPTY_NETWORK))
      .finally(() => setNetLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      {/* Opportunity cards grid */}
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="text-[13px] font-semibold text-bega-text-1">Opportunity Cards</p>
            <p className="text-[11px] text-bega-text-3 mt-0.5">AI-derived actions ranked by priority score · click to reveal action</p>
          </div>
          {!loading && oppData?.cards.length ? (
            <span className="text-[10px] font-medium text-bega-text-3 bg-bega-bg-1 px-2.5 py-1 rounded-full">
              {oppData.cards.length} opportunities
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 bg-bega-bg-1 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : oppData?.cards.length ? (
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {oppData.cards.map((card, i) => (
              <OpportunityCard key={i} card={card} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-bega-border-1 rounded-2xl px-6 py-12 text-center">
            <div className="w-10 h-10 mx-auto mb-4 text-bega-text-3">
              <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" className="w-full h-full">
                <path d="M20 8v4M20 28v4M8 20h4M28 20h4" />
                <path d="M11.7 11.7l2.8 2.8M25.5 25.5l2.8 2.8M28.3 11.7l-2.8 2.8M14.5 25.5l-2.8 2.8" />
                <circle cx="20" cy="20" r="6" />
              </svg>
            </div>
            <p className="text-[14px] font-semibold text-bega-text-2 mb-1">No opportunities yet</p>
            <p className="text-[12px] text-bega-text-3 max-w-sm mx-auto">
              Opportunity cards are generated from query trends, lead activity, and product demand signals. Keep the AI advisor active to surface insights.
            </p>
          </div>
        )}
      </div>

      {/* Network graph */}
      <div className="bg-white border border-bega-border-1 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bega-border-1 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-bega-text-1">Query–Product–Lead Network</p>
            <p className="text-[11px] text-bega-text-3 mt-0.5">
              Force-directed graph · how categories, topics, and leads interconnect
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-bega-black" />
              <span className="text-[10px] text-bega-text-3">Category</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#5A5750]" />
              <span className="text-[10px] text-bega-text-3">Topic</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#B5A99A]" />
              <span className="text-[10px] text-bega-text-3">Lead</span>
            </div>
          </div>
        </div>

        <div className="h-[460px] relative">
          {netLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-bega-black/20 border-t-bega-black rounded-full animate-spin" />
                <p className="text-[12px] text-bega-text-3">Building network graph…</p>
              </div>
            </div>
          ) : (
            <NetworkGraph data={netData} />
          )}
        </div>
      </div>
    </div>
  );
}
