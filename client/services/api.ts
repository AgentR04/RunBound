import { Platform } from 'react-native';
import { Territory } from '../types/game';

// Android emulator reaches the host machine via 10.0.2.2
// iOS simulator and real devices can use localhost / your machine's LAN IP
export const API_BASE =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';
const API_TIMEOUT_MS = 4000;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`API timeout after ${API_TIMEOUT_MS}ms for ${path}`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${text || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// ── Territory endpoints ───────────────────────────────────────────

export interface ClaimTerritoryPayload {
  territory: Territory;
  run?: {
    id: string;
    distance: number;
    duration: number;
    averagePace: string;
    averageSpeed: number;
    calories: number;
    path: Array<{ latitude: number; longitude: number; timestamp: number }>;
  };
}

export function fetchTerritories(): Promise<Territory[]> {
  return request<Territory[]>('/api/territories');
}

export function claimTerritory(payload: ClaimTerritoryPayload): Promise<Territory> {
  return request<Territory>('/api/territories', {
    method: 'POST',
    body: JSON.stringify({ ...payload.territory, run: payload.run }),
  });
}

// ── User endpoints ────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  color: string;
  territories: string[];
  territoriesOwned?: number; // computed field returned by GET /api/users list
  totalRuns: number;
  totalDistance: number;
  totalArea: number;
  coins?: number;
  shieldCharges?: number;
  shieldActive?: boolean;
  shieldExpiresAt?: string | null;
  createdAt: string;
}

export function fetchUser(userId: string): Promise<UserProfile> {
  return request<UserProfile>(`/api/users/${userId}`);
}

export interface UpsertUserProfilePayload {
  id: string;
  username: string;
  color?: string;
  coins?: number;
  shieldCharges?: number;
  shieldActive?: boolean;
  shieldExpiresAt?: string | null;
}

export function upsertUserProfile(
  payload: UpsertUserProfilePayload,
): Promise<UserProfile> {
  return request<UserProfile>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchLeaderboard(): Promise<UserProfile[]> {
  return request<UserProfile[]>('/api/users');
}

// ── Activity endpoints ────────────────────────────────────────────

export interface Activity {
  id: string;
  type: 'territory_claimed' | 'run_completed' | 'territory_defended';
  userId: string;
  username: string;
  userColor: string;
  timestamp: string;
  message: string;
  data: {
    territoryId?: string;
    area?: number;
    distance?: number;
    duration?: number;
    centroid?: { latitude: number; longitude: number };
  };
}

export function fetchActivities(limit = 50): Promise<Activity[]> {
  return request<Activity[]>(`/api/activities?limit=${limit}`);
}
