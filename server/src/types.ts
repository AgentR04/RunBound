// Shared types mirroring the client's game.ts

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
}

export interface Territory {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerColor: string;
  boundary: LocationPoint[];
  area: number; // km²
  claimedAt: string; // ISO string
  lastDefended: string | null;
  strength: number; // 0-100
  isUnderChallenge: boolean;
  runId: string;
}

export interface Run {
  id: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  path: LocationPoint[];
  distance: number; // km
  duration: number; // seconds
  averagePace: string;
  averageSpeed: number;
  isLoop: boolean;
  territoryClaimed: string | null;
  territoriesChallenged: string[];
  calories: number;
}

export interface User {
  id: string;
  username: string;
  color: string;
  territories: string[];
  totalArea: number;
  totalRuns: number;
  totalDistance: number;
  createdAt: string;
}

export type ActivityType = 'territory_claimed' | 'run_completed' | 'territory_defended';

export interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  username: string;
  userColor: string;
  timestamp: string; // ISO string
  message: string;
  data: {
    territoryId?: string;
    area?: number;
    distance?: number;
    duration?: number;
    centroid?: { latitude: number; longitude: number };
  };
}
