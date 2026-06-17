'use client';

import { useState } from 'react';
import SecondaryNav, { type V2Tab } from '@/components/admin/insights/SecondaryNav';
import OverviewTab from '@/components/admin/insights/tabs/OverviewTab';
import LeadIntelligenceTab from '@/components/admin/insights/tabs/LeadIntelligenceTab';
import ProductIntelligenceTab from '@/components/admin/insights/tabs/ProductIntelligenceTab';
import SpecificationTab from '@/components/admin/insights/tabs/SpecificationTab';
import ContentIntelligenceTab from '@/components/admin/insights/tabs/ContentIntelligenceTab';
export default function AiInsightsPage() {
  const [activeTab, setActiveTab] = useState<V2Tab>('overview');

  return (
    <div className="px-6 py-7">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-bega-text-1 tracking-tight mb-1">AI Insights</h1>
          <p className="text-[13px] text-bega-text-3">
            Business intelligence from real BEGA AI Product Advisor data.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-bega-text-3 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
      </div>

      {/* Secondary navigation */}
      <SecondaryNav active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === 'overview'       && <OverviewTab />}
      {activeTab === 'leads'          && <LeadIntelligenceTab />}
      {activeTab === 'products'       && <ProductIntelligenceTab />}
      {activeTab === 'specifications' && <SpecificationTab />}
      {activeTab === 'content'        && <ContentIntelligenceTab />}
    </div>
  );
}
