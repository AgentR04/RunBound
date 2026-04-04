import { Activity, LocationPoint, PersonalRecord } from '../models/types';

// Calculate pace in minutes per kilometer
export function calculatePace(distance: number, durationSeconds: number): number {
  if (distance <= 0) return 0;
  return durationSeconds / 60 / distance; // minutes per km
}

// Calculate speed in km/h
export function calculateSpeed(distance: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  return (distance / durationSeconds) * 3600; // km/h
}

// Calculate calories burned (rough estimate)
export function calculateCalories(distance: number, durationMinutes: number, weight: number = 70): number {
  // Basic formula: METs * weight * time
  // Running: ~10-12 METs, Walking: ~3-4 METs
  const mets = distance > 0 ? Math.min(12, 8 + (distance * 2)) : 3;
  return Math.round(mets * weight * (durationMinutes / 60));
}

// Calculate distance from GPS path
export function calculatePathDistance(path: LocationPoint[]): number {
  if (path.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < path.length; i++) {
    totalDistance += calculateHaversineDistance(path[i - 1], path[i]);
  }

  return totalDistance;
}

// Calculate distance between two GPS points using Haversine formula
export function calculateHaversineDistance(
  point1: LocationPoint,
  point2: LocationPoint
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) * Math.cos(toRadians(point2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

// Convert degrees to radians
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Calculate elevation gain from GPS path
export function calculateElevationGain(path: LocationPoint[]): number {
  if (path.length < 2) return 0;

  let totalGain = 0;
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];

    if (prev.altitude && curr.altitude && curr.altitude > prev.altitude) {
      totalGain += curr.altitude - prev.altitude;
    }
  }

  return totalGain;
}

// Check if activity sets a new personal record
export function checkPersonalRecords(activity: Activity, existingRecords: PersonalRecord[]): PersonalRecord[] {
  const newRecords: PersonalRecord[] = [];

  if (!activity.distance || !activity.duration) return newRecords;

  // Check distance-based records
  const distanceRecords = [
    { distance: 1, type: 'fastest_1k' },
    { distance: 5, type: 'fastest_5k' },
    { distance: 10, type: 'fastest_10k' }
  ];

  distanceRecords.forEach(({ distance, type }) => {
    if (activity.distance! >= distance) {
      const timeFor1km = (activity.duration! / activity.distance!) * distance;
      const existingRecord = existingRecords.find(r => r.recordType === type);

      if (!existingRecord || timeFor1km < existingRecord.value) {
        newRecords.push({
          id: generateId(),
          recordType: type as any,
          value: timeFor1km,
          activityId: activity.id,
          achievedAt: activity.startTime
        });
      }
    }
  });

  // Check longest distance
  const longestDistanceRecord = existingRecords.find(r => r.recordType === 'longest_distance');
  if (!longestDistanceRecord || activity.distance > longestDistanceRecord.value) {
    newRecords.push({
      id: generateId(),
      recordType: 'longest_distance',
      value: activity.distance,
      activityId: activity.id,
      achievedAt: activity.startTime
    });
  }

  // Check longest duration
  const longestDurationRecord = existingRecords.find(r => r.recordType === 'longest_duration');
  if (!longestDurationRecord || activity.duration > longestDurationRecord.value) {
    newRecords.push({
      id: generateId(),
      recordType: 'longest_duration',
      value: activity.duration,
      activityId: activity.id,
      achievedAt: activity.startTime
    });
  }

  // Check fastest pace
  const fastestPaceRecord = existingRecords.find(r => r.recordType === 'fastest_pace');
  if (activity.avgPace && (!fastestPaceRecord || activity.avgPace < fastestPaceRecord.value)) {
    newRecords.push({
      id: generateId(),
      recordType: 'fastest_pace',
      value: activity.avgPace,
      activityId: activity.id,
      achievedAt: activity.startTime
    });
  }

  // Check most calories
  const mostCaloriesRecord = existingRecords.find(r => r.recordType === 'most_calories');
  if (activity.calories && (!mostCaloriesRecord || activity.calories > mostCaloriesRecord.value)) {
    newRecords.push({
      id: generateId(),
      recordType: 'most_calories',
      value: activity.calories,
      activityId: activity.id,
      achievedAt: activity.startTime
    });
  }

  return newRecords;
}

// Format pace for display (e.g., "5:30")
export function formatPace(paceMinutesPerKm: number): string {
  const minutes = Math.floor(paceMinutesPerKm);
  const seconds = Math.round((paceMinutesPerKm % 1) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Format duration for display (e.g., "1:23:45")
export function formatDuration(durationSeconds: number): string {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Generate UUID (simple version)
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Calculate weekly distance progression
export function calculateWeeklyProgression(activities: Activity[]): number[] {
  const weeks: { [week: string]: number } = {};

  activities.forEach(activity => {
    if (activity.distance) {
      const date = new Date(activity.startTime);
      const year = date.getFullYear();
      const week = getWeekNumber(date);
      const weekKey = `${year}-W${week}`;

      weeks[weekKey] = (weeks[weekKey] || 0) + activity.distance;
    }
  });

  return Object.values(weeks);
}

// Get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}