import type { ActionIconName } from '@/components/action-center/types';

export type { ActionIconName };

export interface AdminAction {
  id: number;
  title: string;
  description: string;
  prompt: string;
  icon: ActionIconName;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

export interface AdminSuggestion {
  id: number;
  text: string;
  isActive: boolean;
  sortOrder: number;
}

export interface HeroContent {
  id: number;
  title: string;
  description: string;
  backgroundImageUrl: string;
}
