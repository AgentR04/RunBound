// Location point interface
export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
}

// Activity interface
export interface Activity {
  id: string;
  title: string;
  type: 'run' | 'walk' | 'cycle' | 'hike';
  startTime: number;
  endTime?: number;
  duration?: number; // in seconds
  distance?: number; // in kilometers
  calories?: number;
  avgPace?: number; // minutes per km
  avgSpeed?: number; // km/h
  maxSpeed?: number; // km/h
  elevationGain?: number; // in meters
  pathData?: LocationPoint[];
  territoryClaimed?: boolean;
  notes?: string;
  createdAt: number;
}

// Personal record interface
export interface PersonalRecord {
  id: string;
  recordType: 'fastest_1k' | 'fastest_5k' | 'fastest_10k' | 'longest_distance' | 'longest_duration' | 'fastest_pace' | 'most_calories';
  value: number;
  activityId?: string;
  achievedAt: number;
}

// Route interface
export interface Route {
  id: string;
  name: string;
  description?: string;
  distance: number;
  elevationGain?: number;
  pathData: LocationPoint[];
  timesCompleted: number;
  avgTime?: number; // in seconds
  bestTime?: number; // in seconds
  createdAt: number;
}

// Segment interface
export interface Segment {
  id: string;
  name: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distance: number;
  elevationGain?: number;
  createdAt: number;
}

// Segment effort interface
export interface SegmentEffort {
  id: string;
  segmentId: string;
  activityId: string;
  elapsedTime: number; // in seconds
  startTime: number;
  avgSpeed?: number;
  maxSpeed?: number;
}

// Analytics data interface
export interface AnalyticsData {
  totalActivities: number;
  totalDistance: number;
  totalDuration: number;
  totalCalories: number;
  avgPace: number;
  weeklyDistance: number[];
  monthlyDistance: number[];
  personalRecords: PersonalRecord[];
  recentActivities: Activity[];
  favoriteRoutes: Route[];
}

// Weekly statistics interface
export interface WeeklyStats {
  week: string; // ISO week format
  distance: number;
  duration: number;
  activities: number;
  calories: number;
  avgPace: number;
}

// Monthly statistics interface
export interface MonthlyStats {
  month: string; // YYYY-MM format
  distance: number;
  duration: number;
  activities: number;
  calories: number;
  avgPace: number;
}

// Pace distribution interface
export interface PaceDistribution {
  paceRange: string; // "4:00-4:30"
  count: number;
  percentage: number;
}

// Performance trend interface
export interface PerformanceTrend {
  date: string;
  avgPace: number;
  distance: number;
  movingAvgPace: number; // 7-day moving average
}

// Achievement interface
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  progress: number; // 0-1 (0-100%)
  target: number;
  category: 'distance' | 'speed' | 'consistency' | 'exploration';
}