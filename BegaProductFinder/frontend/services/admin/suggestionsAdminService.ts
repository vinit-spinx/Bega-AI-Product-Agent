import { triggerRefetch } from '@/store/adminStore';
import type { AdminSuggestion } from '@/types/admin';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY ?? '';

function adminHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', 'X-Admin-Api-Key': ADMIN_KEY };
}

async function assertOk(res: Response, label: string): Promise<void> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${label} [${res.status}]${body ? `: ${body}` : ''}`);
  }
}

export async function fetchAdminSuggestions(): Promise<AdminSuggestion[]> {
  const res = await fetch(`${API_URL}/api/admin/cms/suggestions`, { headers: adminHeaders() });
  await assertOk(res, 'Failed to fetch suggestions');
  return res.json();
}

export async function createAdminSuggestion(data: Omit<AdminSuggestion, 'id'>): Promise<AdminSuggestion> {
  const res = await fetch(`${API_URL}/api/admin/cms/suggestions`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  await assertOk(res, 'Failed to create suggestion');
  const created: AdminSuggestion = await res.json();
  triggerRefetch(['suggestions']);
  return created;
}

export async function updateAdminSuggestion(id: number, data: Omit<AdminSuggestion, 'id'>): Promise<AdminSuggestion> {
  const res = await fetch(`${API_URL}/api/admin/cms/suggestions/${id}`, {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  await assertOk(res, 'Failed to update suggestion');
  const updated: AdminSuggestion = await res.json();
  triggerRefetch(['suggestions']);
  return updated;
}

export async function deleteAdminSuggestion(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/cms/suggestions/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  await assertOk(res, 'Failed to delete suggestion');
  triggerRefetch(['suggestions']);
}

export async function saveAdminSuggestionOrder(items: AdminSuggestion[]): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/cms/suggestions/reorder`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ ids: items.map(s => s.id) }),
  });
  await assertOk(res, 'Failed to reorder suggestions');
  triggerRefetch(['suggestions']);
}
