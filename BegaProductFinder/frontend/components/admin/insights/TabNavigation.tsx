'use client';

export interface InsightTab {
  id: string;
  label: string;
}

interface TabNavigationProps {
  tabs: InsightTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export default function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex items-center gap-1 bg-bega-bg-1 rounded-xl p-1 overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`flex-shrink-0 px-4 py-2 rounded-lg text-[12px] font-medium transition-all duration-150
            ${activeTab === tab.id
              ? 'bg-white text-bega-text-1 shadow-sm'
              : 'text-bega-text-3 hover:text-bega-text-2'
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
