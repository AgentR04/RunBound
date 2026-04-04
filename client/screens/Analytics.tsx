import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  MonthlyVolumeChart,
  PaceDistributionChart,
  PersonalRecordCard,
  ProgressRing,
  StatCard,
  WeeklyProgressChart,
} from '../components/AnalyticsCharts';
import ActivityStorage, {
  Activity,
  AnalyticsData,
} from '../services/ActivityStorage';
import AchievementService, { Achievement } from '../services/AchievementService';
import {
  calculateConsistencyScore,
  calculateIntensityScore,
  calculatePaceZones,
  calculateVolumeProgression,
  formatDistance,
  formatDuration,
  formatPace,
} from '../utils/analyticsCalculations';

const { width: screenWidth } = Dimensions.get('window');

interface AnalyticsScreenProps {
  navigation: any;
}

const Analytics: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    'week' | 'month' | 'year'
  >('month');

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [analyticsData, activitiesData] = await Promise.all([
        ActivityStorage.calculateAnalytics(),
        ActivityStorage.getActivities(),
      ]);

      setAnalytics(analyticsData);
      setActivities(activitiesData);
      
      // Calculate achievements
      const achievementsData = AchievementService.calculateAchievements(
        activitiesData, 
        analyticsData.personalRecords
      );
      setAchievements(achievementsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await ActivityStorage.syncWithServer();
      await loadAnalyticsData();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading || !analytics) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  // Calculate derived analytics
  const volumeProgression = calculateVolumeProgression(activities, 12);
  const paceZones = calculatePaceZones(activities);
  const consistencyScore = calculateConsistencyScore(activities, 30);
  const avgIntensity =
    activities.length > 0
      ? activities.reduce((sum, a) => sum + calculateIntensityScore(a), 0) /
        activities.length
      : 0;

  // Calculate trends
  const currentWeekDistance =
    volumeProgression.distances[volumeProgression.distances.length - 1] || 0;
  const previousWeekDistance =
    volumeProgression.distances[volumeProgression.distances.length - 2] || 0;
  const distanceTrend =
    currentWeekDistance > previousWeekDistance
      ? 'up'
      : currentWeekDistance < previousWeekDistance
      ? 'down'
      : 'neutral';
  const distanceTrendValue =
    previousWeekDistance > 0
      ? `${Math.abs(
          ((currentWeekDistance - previousWeekDistance) /
            previousWeekDistance) *
            100,
        ).toFixed(0)}%`
      : '';

  const renderTimeframeSelector = () => (
    <View style={styles.timeframeSelector}>
      {(['week', 'month', 'year'] as const).map(timeframe => (
        <TouchableOpacity
          key={timeframe}
          style={[
            styles.timeframeButton,
            selectedTimeframe === timeframe && styles.timeframeButtonActive,
          ]}
          onPress={() => setSelectedTimeframe(timeframe)}
        >
          <Text
            style={[
              styles.timeframeButtonText,
              selectedTimeframe === timeframe &&
                styles.timeframeButtonTextActive,
            ]}
          >
            {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewStats = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        <Text style={styles.sectionTitleBold}>Your</Text> Overview
      </Text>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            title="Total Distance"
            value={formatDistance(analytics.totalDistance)}
            subtitle="kilometers"
            icon={<Ionicons name="footsteps" size={20} color="#52FF30" />}
            trend={distanceTrend}
            trendValue={distanceTrendValue}
          />
          <StatCard
            title="Activities"
            value={analytics.totalActivities.toString()}
            subtitle="completed"
            icon={<Ionicons name="trophy" size={20} color="#FFD700" />}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Total Time"
            value={formatDuration(analytics.totalDuration)}
            subtitle="hours running"
            icon={<Ionicons name="time" size={20} color="#FF9500" />}
          />
          <StatCard
            title="Avg Pace"
            value={formatPace(analytics.avgPace)}
            subtitle="per kilometer"
            icon={<Ionicons name="speedometer" size={20} color="#4ADED0" />}
          />
        </View>
      </View>
    </View>
  );

  const renderProgressRings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        <Text style={styles.sectionTitleBold}>Progress</Text> Rings
      </Text>

      <View style={styles.progressRingsContainer}>
        <View style={styles.progressRingItem}>
          <ProgressRing
            progress={consistencyScore}
            size={120}
            strokeWidth={8}
            color="#52FF30"
          >
            <View style={styles.progressRingContent}>
              <Text style={styles.progressRingValue}>{consistencyScore}%</Text>
              <Text style={styles.progressRingLabel}>Consistency</Text>
            </View>
          </ProgressRing>
        </View>

        <View style={styles.progressRingItem}>
          <ProgressRing
            progress={avgIntensity}
            size={120}
            strokeWidth={8}
            color="#FF9500"
          >
            <View style={styles.progressRingContent}>
              <Text style={styles.progressRingValue}>
                {Math.round(avgIntensity)}%
              </Text>
              <Text style={styles.progressRingLabel}>Intensity</Text>
            </View>
          </ProgressRing>
        </View>

        <View style={styles.progressRingItem}>
          <ProgressRing
            progress={Math.min(100, (currentWeekDistance / 10) * 100)} // 10km weekly goal
            size={120}
            strokeWidth={8}
            color="#4ADED0"
          >
            <View style={styles.progressRingContent}>
              <Text style={styles.progressRingValue}>
                {formatDistance(currentWeekDistance, 1)}
              </Text>
              <Text style={styles.progressRingLabel}>This Week</Text>
            </View>
          </ProgressRing>
        </View>
      </View>
    </View>
  );

  const renderPersonalRecords = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        <Text style={styles.sectionTitleBold}>Personal</Text> Records
      </Text>

      {analytics.personalRecords.length > 0 ? (
        <View style={styles.recordsGrid}>
          {analytics.personalRecords.slice(0, 6).map(record => (
            <PersonalRecordCard
              key={record.id}
              title={formatRecordType(record.recordType)}
              value={formatRecordValue(record.recordType, record.value)}
              date={new Date(record.achievedAt).toLocaleDateString()}
              isNewRecord={
                Date.now() - record.achievedAt < 7 * 24 * 60 * 60 * 1000
              } // New if within 7 days
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Complete activities to set personal records!
          </Text>
        </View>
      )}
    </View>
  );

  const renderAchievements = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        <Text style={styles.sectionTitleBold}>Achievements</Text>
      </Text>
      
      {achievements.length > 0 ? (
        <View style={styles.achievementsContainer}>
          {achievements.slice(0, 6).map(achievement => (
            <TouchableOpacity
              key={achievement.id}
              style={[
                styles.achievementCard,
                achievement.isUnlocked && styles.achievementCardUnlocked
              ]}
            >
              <View style={styles.achievementIconContainer}>
                <Ionicons
                  name={achievement.icon as any}
                  size={24}
                  color={
                    achievement.isUnlocked 
                      ? AchievementService.getTierColor(achievement.tier)
                      : '#555'
                  }
                />
              </View>
              
              <View style={styles.achievementInfo}>
                <Text style={[
                  styles.achievementTitle,
                  achievement.isUnlocked && styles.achievementTitleUnlocked
                ]}>
                  {achievement.title}
                </Text>
                <Text style={styles.achievementDescription}>
                  {achievement.description}
                </Text>
                
                {!achievement.isUnlocked && (
                  <View style={styles.achievementProgress}>
                    <View style={styles.achievementProgressBar}>
                      <View
                        style={[
                          styles.achievementProgressFill,
                          { width: `${achievement.progress * 100}%` }
                        ]}
                      />
                    </View>
                    <Text style={styles.achievementProgressText}>
                      {Math.round(achievement.progress * 100)}%
                    </Text>
                  </View>
                )}
                
                {achievement.isUnlocked && achievement.unlockedAt && (
                  <Text style={styles.achievementUnlockedDate}>
                    Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
              
              {achievement.isUnlocked && (
                <View style={styles.achievementBadge}>
                  <Ionicons name="checkmark" size={16} color="#000" />
                </View>
              )}
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity style={styles.viewMoreButton}>
            <Text style={styles.viewMoreText}>
              View All {achievements.length} Achievements
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#52FF30" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Complete activities to unlock achievements!
          </Text>
        </View>
      )}
    </View>
  );

  const renderCharts = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        <Text style={styles.sectionTitleBold}>Performance</Text> Charts
      </Text>

      <WeeklyProgressChart
        data={volumeProgression.distances}
        labels={volumeProgression.labels}
        title="Weekly Distance Progress"
      />

      <MonthlyVolumeChart
        distances={analytics.monthlyDistance}
        durations={volumeProgression.durations}
        labels={['6mo', '5mo', '4mo', '3mo', '2mo', '1mo']}
      />

      <PaceDistributionChart zones={paceZones} />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#52FF30']}
            tintColor="#52FF30"
            progressBackgroundColor="#1F1F1D"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <TouchableOpacity style={styles.syncButton} onPress={onRefresh}>
            <Ionicons name="sync" size={24} color="#52FF30" />
          </TouchableOpacity>
        </View>

        {renderTimeframeSelector()}
        {renderOverviewStats()}
        {renderProgressRings()}
        {renderPersonalRecords()}
        {renderAchievements()}
        {renderCharts()}

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// Helper functions
const formatRecordType = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    fastest_1k: 'Fastest 1K',
    fastest_5k: 'Fastest 5K',
    fastest_10k: 'Fastest 10K',
    longest_distance: 'Longest Distance',
    longest_duration: 'Longest Duration',
    fastest_pace: 'Fastest Pace',
    most_calories: 'Most Calories',
  };
  return typeMap[type] || type;
};

const formatRecordValue = (type: string, value: number): string => {
  if (type.includes('fastest') && type !== 'fastest_pace') {
    return formatDuration(value);
  } else if (type === 'fastest_pace') {
    return formatPace(value);
  } else if (type === 'longest_distance') {
    return formatDistance(value) + ' km';
  } else if (type === 'longest_duration') {
    return formatDuration(value);
  } else if (type === 'most_calories') {
    return value.toFixed(0) + ' kcal';
  }
  return value.toString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141412',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#141412',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  syncButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1F1F1D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#52FF30',
  },
  timeframeSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#1F1F1D',
    borderRadius: 12,
    padding: 4,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: '#52FF30',
  },
  timeframeButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  timeframeButtonTextActive: {
    color: '#000',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 24,
    marginBottom: 16,
  },
  sectionTitleBold: {
    color: '#fff',
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  statsGrid: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  progressRingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
  },
  progressRingItem: {
    alignItems: 'center',
  },
  progressRingContent: {
    alignItems: 'center',
  },
  progressRingValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressRingLabel: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  recordsGrid: {
    gap: 12,
  },
  emptyState: {
    backgroundColor: '#1F1F1D',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  achievementsContainer: {
    gap: 12,
  },
  achievementCard: {
    backgroundColor: '#1F1F1D',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    opacity: 0.6,
  },
  achievementCardUnlocked: {
    opacity: 1,
    borderColor: '#52FF30',
  },
  achievementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementTitleUnlocked: {
    color: '#fff',
  },
  achievementDescription: {
    color: '#666',
    fontSize: 12,
    marginBottom: 8,
  },
  achievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  achievementProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: '#52FF30',
    borderRadius: 2,
  },
  achievementProgressText: {
    color: '#888',
    fontSize: 10,
    minWidth: 30,
  },
  achievementUnlockedDate: {
    color: '#666',
    fontSize: 10,
  },
  achievementBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#52FF30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252525',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  viewMoreText: {
    color: '#52FF30',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Analytics;
