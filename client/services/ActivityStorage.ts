import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

const STORAGE_KEYS = {
  ACTIVITIES: '@runbound_activities',
  PERSONAL_RECORDS: '@runbound_records',
  SYNC_QUEUE: '@runbound_sync_queue',
  LAST_SYNC: '@runbound_last_sync',
} as const;

const API_BASE_URL = 'http://localhost:3000/api';

class ActivityStorageService {
  // Local storage methods
  async saveActivity(activity: Activity): Promise<void> {
    try {
      const activities = await this.getActivities();
      const existingIndex = activities.findIndex(a => a.id === activity.id);

      if (existingIndex >= 0) {
        activities[existingIndex] = activity;
      } else {
        activities.unshift(activity);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));

      // Add to sync queue for server upload
      await this.addToSyncQueue('CREATE_ACTIVITY', activity);
    } catch (error) {
      console.error('Failed to save activity:', error);
      throw error;
    }
  }

  async getActivities(): Promise<Activity[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get activities:', error);
      return [];
    }
  }

  async getActivity(id: string): Promise<Activity | null> {
    try {
      const activities = await this.getActivities();
      return activities.find(a => a.id === id) || null;
    } catch (error) {
      console.error('Failed to get activity:', error);
      return null;
    }
  }

  async updateActivity(id: string, updates: Partial<Activity>): Promise<void> {
    try {
      const activities = await this.getActivities();
      const index = activities.findIndex(a => a.id === id);

      if (index >= 0) {
        activities[index] = { ...activities[index], ...updates };
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));

        // Add to sync queue
        await this.addToSyncQueue('UPDATE_ACTIVITY', { id, ...updates });
      }
    } catch (error) {
      console.error('Failed to update activity:', error);
      throw error;
    }
  }

  async deleteActivity(id: string): Promise<void> {
    try {
      const activities = await this.getActivities();
      const filtered = activities.filter(a => a.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(filtered));

      // Add to sync queue
      await this.addToSyncQueue('DELETE_ACTIVITY', { id });
    } catch (error) {
      console.error('Failed to delete activity:', error);
      throw error;
    }
  }

  // Personal records methods
  async savePersonalRecord(record: PersonalRecord): Promise<void> {
    try {
      const records = await this.getPersonalRecords();
      const existingIndex = records.findIndex(r => r.recordType === record.recordType);

      if (existingIndex >= 0) {
        // Only update if it's a better record
        if (this.isBetterRecord(record, records[existingIndex])) {
          records[existingIndex] = record;
        } else {
          return; // Not a better record
        }
      } else {
        records.push(record);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.PERSONAL_RECORDS, JSON.stringify(records));
    } catch (error) {
      console.error('Failed to save personal record:', error);
      throw error;
    }
  }

  async getPersonalRecords(): Promise<PersonalRecord[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PERSONAL_RECORDS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get personal records:', error);
      return [];
    }
  }

  private isBetterRecord(newRecord: PersonalRecord, existingRecord: PersonalRecord): boolean {
    // For time-based records (pace, duration for distances), lower is better
    // For distance and calorie records, higher is better
    const timeBasedRecords = ['fastest_1k', 'fastest_5k', 'fastest_10k', 'fastest_pace'];

    if (timeBasedRecords.includes(newRecord.recordType)) {
      return newRecord.value < existingRecord.value;
    } else {
      return newRecord.value > existingRecord.value;
    }
  }

  // Analytics methods
  async calculateAnalytics(): Promise<AnalyticsData> {
    try {
      const activities = await this.getActivities();
      const personalRecords = await this.getPersonalRecords();

      const totalActivities = activities.length;
      const totalDistance = activities.reduce((sum, a) => sum + (a.distance || 0), 0);
      const totalDuration = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
      const totalCalories = activities.reduce((sum, a) => sum + (a.calories || 0), 0);
      const avgPace = activities.length > 0 ?
        activities.reduce((sum, a) => sum + (a.avgPace || 0), 0) / activities.length : 0;

      // Calculate weekly distance for last 12 weeks
      const weeklyDistance = this.calculateWeeklyDistance(activities, 12);

      // Calculate monthly distance for last 12 months
      const monthlyDistance = this.calculateMonthlyDistance(activities, 12);

      // Get recent activities (last 10)
      const recentActivities = activities.slice(0, 10);

      return {
        totalActivities,
        totalDistance,
        totalDuration,
        totalCalories,
        avgPace,
        weeklyDistance,
        monthlyDistance,
        personalRecords,
        recentActivities,
      };
    } catch (error) {
      console.error('Failed to calculate analytics:', error);
      throw error;
    }
  }

  private calculateWeeklyDistance(activities: Activity[], weeks: number): number[] {
    const now = new Date();
    const weeklyData: number[] = new Array(weeks).fill(0);

    activities.forEach(activity => {
      const activityDate = new Date(activity.startTime);
      const weeksDiff = Math.floor((now.getTime() - activityDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

      if (weeksDiff >= 0 && weeksDiff < weeks && activity.distance) {
        weeklyData[weeks - 1 - weeksDiff] += activity.distance;
      }
    });

    return weeklyData;
  }

  private calculateMonthlyDistance(activities: Activity[], months: number): number[] {
    const now = new Date();
    const monthlyData: number[] = new Array(months).fill(0);

    activities.forEach(activity => {
      const activityDate = new Date(activity.startTime);
      const yearDiff = now.getFullYear() - activityDate.getFullYear();
      const monthDiff = yearDiff * 12 + (now.getMonth() - activityDate.getMonth());

      if (monthDiff >= 0 && monthDiff < months && activity.distance) {
        monthlyData[months - 1 - monthDiff] += activity.distance;
      }
    });

    return monthlyData;
  }

  // Sync queue methods
  private async addToSyncQueue(action: string, data: any): Promise<void> {
    try {
      const queue = await this.getSyncQueue();
      queue.push({
        id: Date.now().toString(),
        action,
        data,
        timestamp: Date.now(),
      });
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  }

  private async getSyncQueue(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  // Server sync methods
  async syncWithServer(): Promise<void> {
    try {
      // First, upload queued changes
      await this.uploadQueuedChanges();

      // Then, download latest data
      await this.downloadFromServer();

      // Update last sync timestamp
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (error) {
      console.error('Failed to sync with server:', error);
      throw error;
    }
  }

  private async uploadQueuedChanges(): Promise<void> {
    const queue = await this.getSyncQueue();

    for (const item of queue) {
      try {
        switch (item.action) {
          case 'CREATE_ACTIVITY':
            await this.uploadActivity(item.data);
            break;
          case 'UPDATE_ACTIVITY':
            await this.updateActivityOnServer(item.data);
            break;
          case 'DELETE_ACTIVITY':
            await this.deleteActivityOnServer(item.data.id);
            break;
        }
      } catch (error) {
        console.error('Failed to upload queued item:', error);
        // Continue with other items
      }
    }

    // Clear sync queue
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([]));
  }

  private async uploadActivity(activity: Activity): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity),
    });

    if (!response.ok) {
      throw new Error('Failed to upload activity');
    }
  }

  private async updateActivityOnServer(updates: Partial<Activity> & { id: string }): Promise<void> {
    const { id, ...data } = updates;
    const response = await fetch(`${API_BASE_URL}/activities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update activity on server');
    }
  }

  private async deleteActivityOnServer(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/activities/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete activity on server');
    }
  }

  private async downloadFromServer(): Promise<void> {
    try {
      // Download activities
      const activitiesResponse = await fetch(`${API_BASE_URL}/activities`);
      if (activitiesResponse.ok) {
        const { activities } = await activitiesResponse.json();
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
      }

      // Download analytics data
      const analyticsResponse = await fetch(`${API_BASE_URL}/analytics/summary`);
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        if (analyticsData.personalRecords) {
          await AsyncStorage.setItem(STORAGE_KEYS.PERSONAL_RECORDS, JSON.stringify(analyticsData.personalRecords));
        }
      }
    } catch (error) {
      console.error('Failed to download from server:', error);
      throw error;
    }
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACTIVITIES,
        STORAGE_KEYS.PERSONAL_RECORDS,
        STORAGE_KEYS.SYNC_QUEUE,
        STORAGE_KEYS.LAST_SYNC,
      ]);
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }

  async getLastSyncTimestamp(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return data ? parseInt(data) : 0;
    } catch (error) {
      console.error('Failed to get last sync timestamp:', error);
      return 0;
    }
  }
}

export default new ActivityStorageService();