import { triggerRefetch } from '@/store/adminStore';
import type { HeroContent } from '@/types/admin';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? '';

function adminHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', 'X-Admin-Api-Key': ADMIN_KEY };
}

export async function fetchHeroContent(): Promise<HeroContent> {
  const res = await fetch(`${API_URL}/api/admin/cms/hero-content`, { headers: adminHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch hero content: ${res.statusText}`);
  return res.json();
}

export async function saveHeroContent(data: Omit<HeroContent, 'id'>): Promise<HeroContent> {
  const res = await fetch(`${API_URL}/api/admin/cms/hero-content`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to save hero content: ${res.statusText}`);
  const saved: HeroContent = await res.json();
  triggerRefetch(['hero']);
  return saved;
}
