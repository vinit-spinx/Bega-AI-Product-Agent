'use client';

import { useActiveActions } from '@/hooks/useAdminStore';
import type { SidebarAction } from '../types';
import type { AdminAction } from '@/types/admin';

function toSidebarAction(a: AdminAction): SidebarAction {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    icon: a.icon,
    prompt: a.prompt,
    sortOrder: a.sortOrder,
    isActive: a.isActive,
    isFeatured: a.isFeatured,
  };
}

interface UseActionsResult {
  featured: SidebarAction[];
  all: SidebarAction[];
  loading: boolean;
  error: string | null;
}

export function useActions(): UseActionsResult {
  const active = useActiveActions();
  const sidebarActions = active.map(toSidebarAction);

  return {
    featured: sidebarActions.filter(a => a.isFeatured),
    all: sidebarActions.filter(a => !a.isFeatured),
    loading: false,
    error: null,
  };
}
