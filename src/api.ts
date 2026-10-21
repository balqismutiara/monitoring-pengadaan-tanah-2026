import { Program, RkmSummary } from './types';
import { ChecklistState } from './checklist';

/**
 * Klien API backend (Express + MySQL).
 * - Saat development, Vite mem-proxy `/api` ke http://localhost:3000 (lihat vite.config.ts).
 * - Untuk server terpisah, isi VITE_API_URL di .env.local, mis. VITE_API_URL=https://api.domainanda.id
 */
const API_BASE = (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, '') || '';

export interface DataSnapshot {
  programs: Program[];
  checklist: ChecklistState;
  rkmSummary: RkmSummary | null;
  updatedAt: string | null;
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.success === false) {
      throw new Error(body?.message || `HTTP ${response.status}`);
    }
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

/** true bila backend & database siap. */
export async function checkBackend(): Promise<boolean> {
  try {
    const body = await request<{ database?: boolean }>('/api/health', undefined, 4000);
    return Boolean(body.database);
  } catch {
    return false;
  }
}

export async function fetchSnapshot(): Promise<DataSnapshot> {
  const body = await request<{ data: DataSnapshot }>('/api/data');
  return body.data;
}

export async function savePrograms(programs: Program[], changedBy?: string) {
  return request<{ success: boolean; updatedAt: string }>('/api/programs', {
    method: 'PUT',
    body: JSON.stringify({ programs, changedBy }),
  });
}

export async function saveChecklistEntry(
  programId: string,
  documentKey: string,
  entry: Record<string, unknown>,
  changedBy?: string,
) {
  return request<{ success: boolean }>(
    `/api/checklist/${encodeURIComponent(programId)}/${encodeURIComponent(documentKey)}`,
    { method: 'PUT', body: JSON.stringify({ ...entry, changedBy }) },
  );
}

export async function fetchActivity(limit = 50) {
  const body = await request<{ data: any[] }>(`/api/activity?limit=${limit}`);
  return body.data;
}

export async function saveChecklistAll(checklist: ChecklistState, changedBy?: string) {
  return request<{ success: boolean }>('/api/checklist', {
    method: 'PUT',
    body: JSON.stringify({ checklist, changedBy }),
  });
}
