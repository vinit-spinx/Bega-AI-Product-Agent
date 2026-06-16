export type ActionIconName =
  | 'compare'
  | 'shield'
  | 'building'
  | 'star'
  | 'controls'
  | 'city'
  | 'leaf'
  | 'document';

export interface SidebarAction {
  id: number;
  title: string;
  description: string;
  icon: ActionIconName;
  prompt: string;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
}
