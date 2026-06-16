'use client';

import ActionCard, { ActionCardSkeleton } from './ActionCard';
import type { SidebarAction } from './types';

interface Props {
  actions: SidebarAction[];
  loading: boolean;
  skeletonCount?: number;
  onSelect: (prompt: string, displayText: string) => void;
}

export default function ActionGrid({ actions, loading, skeletonCount = 3, onSelect }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ActionCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {actions.map(action => (
        <ActionCard key={action.id} action={action} onSelect={onSelect} />
      ))}
    </div>
  );
}
