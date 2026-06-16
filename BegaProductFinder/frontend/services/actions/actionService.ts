import { actionsStore } from '@/store/adminStore';
import type { SidebarAction } from '@/components/action-center/types';
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

/** Reads active actions directly from the shared store — no network call needed. */
export async function fetchActions(): Promise<SidebarAction[]> {
  return actionsStore.getActive().map(toSidebarAction);
}
