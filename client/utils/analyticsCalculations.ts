import { Activity, LocationPoint, PersonalRecord } from '../services/ActivityStorage';

// Enhanced analytics calculation utilities

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

// Calculate calories burned (enhanced formula)
export function calculateCalories(distance: number, durationMinutes: number, weight: number = 70): number {
  if (durationMinutes <= 0) return 0;

  // Enhanced formula based on running pace
  const paceMinPerKm = durationMinutes / distance;
  let mets: number;

  if (paceMinPerKm <= 3.5) { // Very fast (under 3:30/km)
    mets = 16;
  } else if (paceMinPerKm <= 4) { // Fast (3:30-4:00/km)
    mets = 14;
  } else if (paceMinPerKm <= 5) { // Moderate-fast (4:00-5:00/km)
    mets = 12;
  } else if (paceMinPerKm <= 6) { // Moderate (5:00-6:00/km)
    mets = 10;
  } else if (paceMinPerKm <= 7) { // Easy (6:00-7:00/km)
    mets = 8;
  } else { // Walking pace (7:00+/km)
    mets = 6;
  }

  return Math.round(mets * weight * (durationMinutes / 60));
}

// Calculate distance from GPS path using enhanced Haversine formula
export function calculatePathDistance(path: LocationPoint[]): number {
  if (path.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < path.length; i++) {
    const distance = calculateHaversineDistance(path[i - 1], path[i]);
    // Filter out GPS noise (jumps larger than 100m between points)
    if (distance < 0.1) { // 100 meters max
      totalDistance += distance;
    }
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
  let smoothedElevations: number[] = [];

  // First, smooth elevation data to reduce GPS noise
  path.forEach((point, index) => {
    if (!point.altitude) {
      smoothedElevations[index] = smoothedElevations[index - 1] || 0;
      return;
    }

    // Apply simple moving average with window of 3
    const start = Math.max(0, index - 1);
    const end = Math.min(path.length - 1, index + 1);
    let sum = 0;
    let count = 0;

    for (let i = start; i <= end; i++) {
      if (path[i].altitude) {
        sum += path[i].altitude!;
        count++;
      }
    }

    smoothedElevations[index] = count > 0 ? sum / count : (smoothedElevations[index - 1] || 0);
  });

  // Calculate gain from smoothed data
  for (let i = 1; i < smoothedElevations.length; i++) {
    const gain = smoothedElevations[i] - smoothedElevations[i - 1];
    if (gain > 0.5) { // Minimum gain threshold to reduce noise
      totalGain += gain;
    }
  }

  return totalGain;
}

// Check if activity sets a new personal record
export function checkPersonalRecords(activity: Activity, existingRecords: PersonalRecord[]): PersonalRecord[] {
  const newRecords: PersonalRecord[] = [];

  if (!activity.distance || !activity.duration) return newRecords;

  // Distance-based time records
  const distanceRecords = [
    { distance: 1, type: 'fastest_1k' as const },
    { distance: 5, type: 'fastest_5k' as const },
    { distance: 10, type: 'fastest_10k' as const }
  ];

  distanceRecords.forEach(({ distance, type }) => {
    if (activity.distance! >= distance) {
      const timeForDistance = (activity.duration! / activity.distance!) * distance;
      const existingRecord = existingRecords.find(r => r.recordType === type);

      if (!existingRecord || timeForDistance < existingRecord.value) {
        newRecords.push({
          id: generateId(),
          recordType: type,
          value: timeForDistance,
          activityId: activity.id,
          achievedAt: activity.startTime
        });
      }
    }
  });

  // Longest distance
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

  // Longest duration
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

  // Fastest pace
  if (activity.avgPace) {
    const fastestPaceRecord = existingRecords.find(r => r.recordType === 'fastest_pace');
    if (!fastestPaceRecord || activity.avgPace < fastestPaceRecord.value) {
      newRecords.push({
        id: generateId(),
        recordType: 'fastest_pace',
        value: activity.avgPace,
        activityId: activity.id,
        achievedAt: activity.startTime
      });
    }
  }

  // Most calories
  if (activity.calories) {
    const mostCaloriesRecord = existingRecords.find(r => r.recordType === 'most_calories');
    if (!mostCaloriesRecord || activity.calories > mostCaloriesRecord.value) {
      newRecords.push({
        id: generateId(),
        recordType: 'most_calories',
        value: activity.calories,
        activityId: activity.id,
        achievedAt: activity.startTime
      });
    }
  }

  return newRecords;
}

// Format pace for display (e.g., "5:30")
export function formatPace(paceMinutesPerKm: number): string {
  if (!paceMinutesPerKm || paceMinutesPerKm === 0) return '0:00';

  const minutes = Math.floor(paceMinutesPerKm);
  const seconds = Math.round((paceMinutesPerKm % 1) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Format duration for display (e.g., "1:23:45")
export function formatDuration(durationSeconds: number): string {
  if (!durationSeconds || durationSeconds === 0) return '0:00';

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = Math.floor(durationSeconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Format distance for display
export function formatDistance(distanceKm: number, decimals: number = 2): string {
  if (!distanceKm || distanceKm === 0) return '0.0';
  return distanceKm.toFixed(decimals);
}

// Calculate activity intensity score (0-100)
export function calculateIntensityScore(activity: Activity): number {
  if (!activity.avgPace || !activity.duration) return 0;

  // Base score on pace relative to common running paces
  let paceScore = 0;
  if (activity.avgPace <= 3.5) paceScore = 100; // Elite
  else if (activity.avgPace <= 4) paceScore = 90;  // Very fast
  else if (activity.avgPace <= 5) paceScore = 75;  // Fast
  else if (activity.avgPace <= 6) paceScore = 60;  // Moderate
  else if (activity.avgPace <= 7) paceScore = 40;  // Easy
  else paceScore = 20; // Recovery/Walking

  // Adjust for duration (longer activities get slight boost)
  const durationMinutes = activity.duration / 60;
  let durationMultiplier = 1;
  if (durationMinutes > 60) durationMultiplier = 1.1;      // > 1 hour
  else if (durationMinutes > 30) durationMultiplier = 1.05; // > 30 min

  return Math.min(100, Math.round(paceScore * durationMultiplier));
}

// Calculate weekly volume progression
export function calculateVolumeProgression(activities: Activity[], weeks: number = 12): {
  labels: string[];
  distances: number[];
  durations: number[];
} {
  const now = new Date();
  const weeklyData: { [weekKey: string]: { distance: number; duration: number } } = {};

  // Initialize weeks
  for (let i = 0; i < weeks; i++) {
    const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekKey = getWeekKey(date);
    weeklyData[weekKey] = { distance: 0, duration: 0 };
  }

  // Aggregate activities by week
  activities.forEach(activity => {
    const activityDate = new Date(activity.startTime);
    const weekKey = getWeekKey(activityDate);

    if (weeklyData[weekKey]) {
      weeklyData[weekKey].distance += activity.distance || 0;
      weeklyData[weekKey].duration += activity.duration || 0;
    }
  });

  // Extract arrays for charts
  const sortedWeeks = Object.keys(weeklyData).sort();
  const labels = sortedWeeks.map(week => {
    const [year, weekNum] = week.split('-W');
    return `W${weekNum}`;
  });
  const distances = sortedWeeks.map(week => weeklyData[week].distance);
  const durations = sortedWeeks.map(week => Math.round(weeklyData[week].duration / 60)); // Convert to minutes

  return { labels, distances, durations };
}

// Calculate pace zone distribution
export function calculatePaceZones(activities: Activity[]): {
  zone1: number; // Easy (7:00+)
  zone2: number; // Moderate (5:30-7:00)
  zone3: number; // Tempo (4:30-5:30)
  zone4: number; // Threshold (3:45-4:30)
  zone5: number; // VO2 Max (3:00-3:45)
  zone6: number; // Neuromuscular (<3:00)
} {
  const zones = { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0, zone6: 0 };
  let totalActivities = 0;

  activities.forEach(activity => {
    if (!activity.avgPace) return;

    totalActivities++;
    const pace = activity.avgPace;

    if (pace >= 7) zones.zone1++;
    else if (pace >= 5.5) zones.zone2++;
    else if (pace >= 4.5) zones.zone3++;
    else if (pace >= 3.75) zones.zone4++;
    else if (pace >= 3) zones.zone5++;
    else zones.zone6++;
  });

  // Convert to percentages
  if (totalActivities > 0) {
    Object.keys(zones).forEach(key => {
      zones[key as keyof typeof zones] = Math.round((zones[key as keyof typeof zones] / totalActivities) * 100);
    });
  }

  return zones;
}

// Generate week key (YYYY-W##)
function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

// Get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Generate UUID (simple version)
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Calculate running consistency score (0-100)
export function calculateConsistencyScore(activities: Activity[], days: number = 30): number {
  const now = new Date();
  const daysAgo = now.getTime() - (days * 24 * 60 * 60 * 1000);

  const recentActivities = activities.filter(activity => activity.startTime > daysAgo);

  if (recentActivities.length === 0) return 0;

  // Calculate active days
  const activeDays = new Set(
    recentActivities.map(activity =>
      new Date(activity.startTime).toDateString()
    )
  ).size;

  // Consistency score based on frequency
  const score = Math.min(100, (activeDays / days) * 100 * 3); // 3x multiplier for reasonable scoring

  return Math.round(score);
}