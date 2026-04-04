import { Activity, PersonalRecord } from '../services/ActivityStorage';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'distance' | 'speed' | 'consistency' | 'exploration';
  target: number;
  currentValue: number;
  progress: number; // 0-1
  unlockedAt?: number;
  isUnlocked: boolean;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

// Achievement definitions
const ACHIEVEMENT_DEFINITIONS = [
  // Distance achievements
  {
    id: 'first_km',
    title: 'First Steps',
    description: 'Complete your first 1km',
    icon: 'footsteps',
    category: 'distance' as const,
    target: 1,
    tier: 'bronze' as const,
  },
  {
    id: 'first_5k',
    title: '5K Hero',
    description: 'Run 5 kilometers in a single activity',
    icon: 'trophy',
    category: 'distance' as const,
    target: 5,
    tier: 'silver' as const,
  },
  {
    id: 'first_10k',
    title: '10K Champion',
    description: 'Complete a 10 kilometer run',
    icon: 'medal',
    category: 'distance' as const,
    target: 10,
    tier: 'gold' as const,
  },
  {
    id: 'half_marathon',
    title: 'Half Marathon Hero',
    description: 'Run 21.1 kilometers in one go',
    icon: 'star',
    category: 'distance' as const,
    target: 21.1,
    tier: 'platinum' as const,
  },

  // Cumulative distance achievements
  {
    id: 'total_50k',
    title: 'Getting Started',
    description: 'Run a total of 50 kilometers',
    icon: 'trending-up',
    category: 'distance' as const,
    target: 50,
    tier: 'bronze' as const,
  },
  {
    id: 'total_100k',
    title: 'Century Runner',
    description: 'Reach 100 total kilometers',
    icon: 'flash',
    category: 'distance' as const,
    target: 100,
    tier: 'silver' as const,
  },
  {
    id: 'total_500k',
    title: 'Distance Destroyer',
    description: 'Complete 500 total kilometers',
    icon: 'flame',
    category: 'distance' as const,
    target: 500,
    tier: 'gold' as const,
  },
  {
    id: 'total_1000k',
    title: 'Legendary Runner',
    description: 'Achieve 1000 total kilometers',
    icon: 'diamond',
    category: 'distance' as const,
    target: 1000,
    tier: 'platinum' as const,
  },

  // Speed achievements
  {
    id: 'sub_5_pace',
    title: 'Speed Demon',
    description: 'Run with pace under 5:00/km',
    icon: 'speedometer',
    category: 'speed' as const,
    target: 5,
    tier: 'silver' as const,
  },
  {
    id: 'sub_4_pace',
    title: 'Lightning Fast',
    description: 'Achieve pace under 4:00/km',
    icon: 'flash-outline',
    category: 'speed' as const,
    target: 4,
    tier: 'gold' as const,
  },

  // Consistency achievements
  {
    id: 'three_day_streak',
    title: 'Getting Consistent',
    description: 'Run 3 days in a row',
    icon: 'calendar',
    category: 'consistency' as const,
    target: 3,
    tier: 'bronze' as const,
  },
  {
    id: 'week_streak',
    title: 'Week Warrior',
    description: 'Run every day for a week',
    icon: 'checkmark-circle',
    category: 'consistency' as const,
    target: 7,
    tier: 'silver' as const,
  },
  {
    id: 'month_streak',
    title: 'Unstoppable',
    description: 'Run every day for 30 days',
    icon: 'infinite',
    category: 'consistency' as const,
    target: 30,
    tier: 'platinum' as const,
  },

  // Activity count achievements
  {
    id: 'ten_activities',
    title: 'Regular Runner',
    description: 'Complete 10 activities',
    icon: 'list',
    category: 'consistency' as const,
    target: 10,
    tier: 'bronze' as const,
  },
  {
    id: 'fifty_activities',
    title: 'Dedicated Athlete',
    description: 'Complete 50 activities',
    icon: 'heart',
    category: 'consistency' as const,
    target: 50,
    tier: 'silver' as const,
  },
  {
    id: 'hundred_activities',
    title: 'Running Machine',
    description: 'Complete 100 activities',
    icon: 'star',
    category: 'consistency' as const,
    target: 100,
    tier: 'gold' as const,
  },

  // Exploration achievements
  {
    id: 'first_territory',
    title: 'Territory Explorer',
    description: 'Claim your first territory',
    icon: 'flag',
    category: 'exploration' as const,
    target: 1,
    tier: 'bronze' as const,
  },
  {
    id: 'five_territories',
    title: 'Land Owner',
    description: 'Claim 5 territories',
    icon: 'map',
    category: 'exploration' as const,
    target: 5,
    tier: 'silver' as const,
  },
];

export class AchievementService {
  static calculateAchievements(activities: Activity[], personalRecords: PersonalRecord[]): Achievement[] {
    const achievements: Achievement[] = [];

    // Calculate various metrics
    const totalDistance = activities.reduce((sum, a) => sum + (a.distance || 0), 0);
    const maxSingleDistance = Math.max(...activities.map(a => a.distance || 0));
    const fastestPace = Math.min(...activities.filter(a => a.avgPace).map(a => a.avgPace!));
    const totalActivities = activities.length;
    const totalTerritories = activities.filter(a => a.territoryClaimed).length;

    // Calculate streak
    const currentStreak = this.calculateCurrentStreak(activities);

    ACHIEVEMENT_DEFINITIONS.forEach(def => {
      let currentValue = 0;
      let isUnlocked = false;

      // Calculate current value based on achievement type
      switch (def.id) {
        // Single distance achievements
        case 'first_km':
        case 'first_5k':
        case 'first_10k':
        case 'half_marathon':
          currentValue = maxSingleDistance;
          isUnlocked = maxSingleDistance >= def.target;
          break;

        // Total distance achievements
        case 'total_50k':
        case 'total_100k':
        case 'total_500k':
        case 'total_1000k':
          currentValue = totalDistance;
          isUnlocked = totalDistance >= def.target;
          break;

        // Speed achievements (lower is better)
        case 'sub_5_pace':
        case 'sub_4_pace':
          currentValue = fastestPace;
          isUnlocked = fastestPace > 0 && fastestPace <= def.target;
          break;

        // Streak achievements
        case 'three_day_streak':
        case 'week_streak':
        case 'month_streak':
          currentValue = currentStreak;
          isUnlocked = currentStreak >= def.target;
          break;

        // Activity count achievements
        case 'ten_activities':
        case 'fifty_activities':
        case 'hundred_activities':
          currentValue = totalActivities;
          isUnlocked = totalActivities >= def.target;
          break;

        // Territory achievements
        case 'first_territory':
        case 'five_territories':
          currentValue = totalTerritories;
          isUnlocked = totalTerritories >= def.target;
          break;

        default:
          currentValue = 0;
          break;
      }

      const progress = Math.min(1, currentValue / def.target);
      const unlockedAt = isUnlocked ? this.findUnlockDate(activities, def.id, def.target) : undefined;

      achievements.push({
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        category: def.category,
        target: def.target,
        currentValue,
        progress,
        isUnlocked,
        unlockedAt,
        tier: def.tier,
      });
    });

    return achievements.sort((a, b) => {
      // Sort by unlocked status first, then by progress
      if (a.isUnlocked !== b.isUnlocked) {
        return a.isUnlocked ? -1 : 1;
      }
      return b.progress - a.progress;
    });
  }

  private static calculateCurrentStreak(activities: Activity[]): number {
    if (activities.length === 0) return 0;

    // Sort activities by date (newest first)
    const sortedActivities = activities.sort((a, b) => b.startTime - a.startTime);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let checkDate = new Date(today);

    for (let i = 0; i < 30; i++) { // Check last 30 days
      const dayActivities = sortedActivities.filter(activity => {
        const activityDate = new Date(activity.startTime);
        activityDate.setHours(0, 0, 0, 0);
        return activityDate.getTime() === checkDate.getTime();
      });

      if (dayActivities.length > 0) {
        streak++;
      } else {
        // Allow for today if it's the first day being checked
        if (i === 0 && checkDate.getTime() === today.getTime()) {
          // Today can be skipped if no activity yet
        } else {
          break;
        }
      }

      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }

  private static findUnlockDate(activities: Activity[], achievementId: string, target: number): number | undefined {
    // For simplicity, return the date of the activity that unlocked the achievement
    const sortedActivities = activities.sort((a, b) => a.startTime - b.startTime);

    switch (achievementId) {
      case 'first_km':
      case 'first_5k':
      case 'first_10k':
      case 'half_marathon': {
        const unlockActivity = sortedActivities.find(a => (a.distance || 0) >= target);
        return unlockActivity?.startTime;
      }

      case 'first_territory': {
        const unlockActivity = sortedActivities.find(a => a.territoryClaimed);
        return unlockActivity?.startTime;
      }

      default: {
        // For cumulative achievements, find when target was reached
        let cumulative = 0;
        for (const activity of sortedActivities) {
          cumulative += activity.distance || 0;
          if (cumulative >= target) {
            return activity.startTime;
          }
        }
        return undefined;
      }
    }
  }

  static getNewlyUnlockedAchievements(
    previousActivities: Activity[],
    currentActivities: Activity[],
    personalRecords: PersonalRecord[]
  ): Achievement[] {
    const previousAchievements = this.calculateAchievements(previousActivities, personalRecords);
    const currentAchievements = this.calculateAchievements(currentActivities, personalRecords);

    const previousUnlocked = new Set(
      previousAchievements.filter(a => a.isUnlocked).map(a => a.id)
    );

    return currentAchievements.filter(
      achievement => achievement.isUnlocked && !previousUnlocked.has(achievement.id)
    );
  }

  static getTierColor(tier: Achievement['tier']): string {
    switch (tier) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      default: return '#888';
    }
  }

  static getCategoryIcon(category: Achievement['category']): string {
    switch (category) {
      case 'distance': return 'footsteps';
      case 'speed': return 'speedometer';
      case 'consistency': return 'calendar';
      case 'exploration': return 'map';
      default: return 'trophy';
    }
  }
}

export default AchievementService;