import { LocationPoint } from '../utils/gpsTracking';

export type PathRewardType =
  | 'coin'
  | 'capture_multiplier'
  | 'shield'
  | 'ghost_mode';

export interface PathRewardDrop {
  id: string;
  type: PathRewardType;
  coordinate: Pick<LocationPoint, 'latitude' | 'longitude'>;
  value: number;
  rewardText: string;
  spawnedAt: number;
  expiresAt: number;
  status: 'active' | 'collecting';
  collectedAt?: number | null;
}

export interface CollectedPathReward {
  id: string;
  type: PathRewardType;
  label: string;
  value: number;
  rewardText: string;
  collectedAt: number;
}

export interface PathRewardSummary {
  collectedDrops: CollectedPathReward[];
  coinsCollected: number;
  shieldsCollected: number;
}

// Territory claimed by running a closed loop
export interface Territory {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerColor: string;
  boundary: LocationPoint[]; // Polygon coordinates
  area: number; // km²
  claimedAt: Date;
  lastDefended: Date | null;
  strength: number; // 0-100, decreases over time
  isUnderChallenge: boolean;
  runId: string; // ID of run that created this territory
}

// A running session
export interface Run {
  id: string;
  userId: string;
  startTime: Date;
  endTime: Date | null;
  path: LocationPoint[];
  distance: number; // km
  duration: number; // seconds
  averagePace: string; // "6'02"" format
  averageSpeed: number; // km/h
  isLoop: boolean;
  territoryClaimed: string | null; // territory ID if loop was closed
  territoriesChallenged: string[];
  calories: number;
  heartRate?: number; // bpm
  elevation?: number; // meters
  pathRewardSummary?: PathRewardSummary;
}

// User profile and stats
export interface User {
  id: string;
  username: string;
  color: string; // Territory color on map
  territories: string[]; // territory IDs
  totalArea: number; // km²
  streaks: {
    daily: number;
    weekly: number;
    explorer: number;
  };
  activeBoosts: string[];
  totalRuns: number;
  totalDistance: number; // km
  friends: string[];
  coins: number;
  shieldCharges: number;
  shieldActive: boolean;
  shieldExpiresAt: number | null;
  createdAt: Date;
}

// Streak tracking
export interface Streak {
  type: 'daily' | 'weekly' | 'explorer';
  count: number;
  lastUpdated: Date;
  reward: string;
  isActive: boolean;
}

// Run state for active tracking
export type RunState = 'idle' | 'ready' | 'running' | 'paused' | 'completed';

export interface ActiveRun {
  state: RunState;
  startTime: Date | null;
  path: LocationPoint[];
  distance: number;
  duration: number;
  pausedDuration: number;
  isNearStart: boolean; // True when within loop closure threshold
  drops: PathRewardDrop[];
  collectedDrops: CollectedPathReward[];
  dropsCollected: number;
  coinsCollected: number;
  shieldChargesEarned: number;
  captureMultiplier: number;
  multiplierExpiresAt: number | null;
  ghostUntil: number | null;
  dropProgressMeters: number;
}

// Mock current user for development
export const MOCK_USER: User = {
  id: 'user-1',
  username: 'Runner',
  color: '#52FF30',
  territories: [],
  totalArea: 0,
  streaks: {
    daily: 3,
    weekly: 2,
    explorer: 1,
  },
  activeBoosts: ['daily-streak'],
  coins: 0,
  shieldCharges: 0,
  shieldActive: false,
  shieldExpiresAt: null,
  totalRuns: 0,
  totalDistance: 0,
  friends: [],
  createdAt: new Date(),
};
