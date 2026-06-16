import { triggerRefetch } from '@/store/adminStore';
import type { AdminAction } from '@/types/admin';

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

export async function fetchAdminActions(): Promise<AdminAction[]> {
  const res = await fetch(`${API_URL}/api/admin/cms/actions`, { headers: adminHeaders() });
  await assertOk(res, 'Failed to fetch actions');
  return res.json();
}

export async function createAdminAction(data: Omit<AdminAction, 'id'>): Promise<AdminAction> {
  const res = await fetch(`${API_URL}/api/admin/cms/actions`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  await assertOk(res, 'Failed to create action');
  const created: AdminAction = await res.json();
  triggerRefetch(['actions']);
  return created;
}

export async function updateAdminAction(id: number, data: Omit<AdminAction, 'id'>): Promise<AdminAction> {
  const res = await fetch(`${API_URL}/api/admin/cms/actions/${id}`, {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  await assertOk(res, 'Failed to update action');
  const updated: AdminAction = await res.json();
  triggerRefetch(['actions']);
  return updated;
}

export async function deleteAdminAction(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/cms/actions/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  await assertOk(res, 'Failed to delete action');
  triggerRefetch(['actions']);
}

export async function reorderAdminActions(orderedIds: number[]): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/cms/actions/reorder`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ ids: orderedIds }),
  });
  await assertOk(res, 'Failed to reorder actions');
  triggerRefetch(['actions']);
}
