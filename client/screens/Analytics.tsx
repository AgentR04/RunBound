import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import GlassPanel from '../components/ui/GlassPanel';
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
import { TITLE_FONT, UI_FONT } from '../theme/fonts';
import {
  calculateConsistencyScore,
  calculateIntensityScore,
  calculatePaceZones,
  calculateVolumeProgression,
  formatDistance,
  formatDuration,
  formatPace,
} from '../utils/analyticsCalculations';

const Analytics: React.FC = () => {
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

      const achievementsData = AchievementService.calculateAchievements(
        activitiesData,
        analyticsData.personalRecords,
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
        <LinearGradient
          colors={['#081223', '#10203A', '#1A2546']}
          style={styles.background}
        />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  const volumeProgression = calculateVolumeProgression(activities, 12);
  const paceZones = calculatePaceZones(activities);
  const consistencyScore = calculateConsistencyScore(activities, 30);
  const avgIntensity =
    activities.length > 0
      ? activities.reduce((sum, activity) => sum + calculateIntensityScore(activity), 0) /
        activities.length
      : 0;

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
          ((currentWeekDistance - previousWeekDistance) / previousWeekDistance) * 100,
        ).toFixed(0)}%`
      : '';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#081223', '#10203A', '#1A2546']}
        style={styles.background}
      />
      <View style={styles.cloudTop} />
      <View style={styles.cloudBottom} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#67E6FF']}
            tintColor="#67E6FF"
            progressBackgroundColor="#10203A"
          />
        }
      >
        <GlassPanel
          style={styles.heroShell}
          accentColors={['rgba(166, 28, 40, 0.72)', 'rgba(103, 230, 255, 0.34)']}
        >
          <LinearGradient
            colors={['#0D1A31', '#13253D']}
            style={styles.heroCard}
          >
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroEyebrow}>Performance Lab</Text>
                <Text style={styles.heroTitle}>Run analytics</Text>
                <Text style={styles.heroSubtitle}>
                  Track streak quality, pace balance, and how your Mumbai loops are
                  evolving each week.
                </Text>
              </View>
              <TouchableOpacity style={styles.syncButton} onPress={onRefresh}>
                <Ionicons name="sync-outline" size={22} color="#FFF1D8" />
              </TouchableOpacity>
            </View>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {formatDistance(analytics.totalDistance)}
                </Text>
                <Text style={styles.heroStatLabel}>Total km</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{analytics.totalActivities}</Text>
                <Text style={styles.heroStatLabel}>Activities</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{Math.round(consistencyScore)}%</Text>
                <Text style={styles.heroStatLabel}>Consistency</Text>
              </View>
            </View>
          </LinearGradient>
        </GlassPanel>

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
                  selectedTimeframe === timeframe && styles.timeframeButtonTextActive,
                ]}
              >
                {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Overview</Text>
          <Text style={styles.sectionTitle}>Your command summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard
                title="Total Distance"
                value={formatDistance(analytics.totalDistance)}
                subtitle="kilometers"
                icon={<Ionicons name="footsteps-outline" size={20} color="#57B8FF" />}
                color="#57B8FF"
                trend={distanceTrend}
                trendValue={distanceTrendValue}
              />
              <StatCard
                title="Activities"
                value={analytics.totalActivities.toString()}
                subtitle="completed"
                icon={<Ionicons name="trophy-outline" size={20} color="#F2A12D" />}
                color="#F2A12D"
              />
            </View>

            <View style={styles.statsRow}>
              <StatCard
                title="Total Time"
                value={formatDuration(analytics.totalDuration)}
                subtitle="hours running"
                icon={<Ionicons name="time-outline" size={20} color="#FF8B5E" />}
                color="#FF8B5E"
              />
              <StatCard
                title="Avg Pace"
                value={formatPace(analytics.avgPace)}
                subtitle="per kilometer"
                icon={<Ionicons name="speedometer-outline" size={20} color="#60C676" />}
                color="#60C676"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Progress</Text>
          <Text style={styles.sectionTitle}>Rings at a glance</Text>
          <GlassPanel style={styles.progressShell}>
            <View style={styles.progressCard}>
              <View style={styles.progressRingsContainer}>
                <View style={styles.progressRingItem}>
                  <ProgressRing
                    progress={consistencyScore}
                    size={116}
                    strokeWidth={8}
                    color="#67E6FF"
                    backgroundColor="rgba(255,255,255,0.08)"
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
                    size={116}
                    strokeWidth={8}
                    color="#D84452"
                    backgroundColor="rgba(255,255,255,0.08)"
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
                    progress={Math.min(100, (currentWeekDistance / 10) * 100)}
                    size={116}
                    strokeWidth={8}
                    color="#F5C15D"
                    backgroundColor="rgba(255,255,255,0.08)"
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
          </GlassPanel>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Records</Text>
          <Text style={styles.sectionTitle}>Personal bests</Text>
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
                  }
                />
              ))}
            </View>
          ) : (
            <GlassPanel style={styles.emptyShell}>
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Complete activities to set personal records.
                </Text>
              </View>
            </GlassPanel>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Milestones</Text>
          <Text style={styles.sectionTitle}>Achievements</Text>

          {achievements.length > 0 ? (
            <View style={styles.achievementsContainer}>
              {achievements.slice(0, 6).map(achievement => (
                <GlassPanel
                  key={achievement.id}
                  style={styles.achievementShell}
                  accentColors={[
                    achievement.isUnlocked
                      ? `${AchievementService.getTierColor(achievement.tier)}55`
                      : 'rgba(190, 205, 220, 0.55)',
                    'rgba(255,255,255,0.78)',
                  ]}
                >
                  <TouchableOpacity
                    style={styles.achievementCard}
                    activeOpacity={0.86}
                  >
                    <View style={styles.achievementIconContainer}>
                      <Ionicons
                        name={achievement.icon as any}
                        size={24}
                        color={
                          achievement.isUnlocked
                            ? AchievementService.getTierColor(achievement.tier)
                            : '#9AA8B8'
                        }
                      />
                    </View>

                    <View style={styles.achievementInfo}>
                      <Text
                        style={[
                          styles.achievementTitle,
                          achievement.isUnlocked && styles.achievementTitleUnlocked,
                        ]}
                      >
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
                                { width: `${achievement.progress * 100}%` },
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
                          Unlocked{' '}
                          {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </Text>
                      )}
                    </View>

                    {achievement.isUnlocked && (
                      <View style={styles.achievementBadge}>
                        <Ionicons name="checkmark" size={16} color="#7A5010" />
                      </View>
                    )}
                  </TouchableOpacity>
                </GlassPanel>
              ))}

              <TouchableOpacity style={styles.viewMoreButton}>
                <Text style={styles.viewMoreText}>
                  View All {achievements.length} Achievements
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#0D4D7A" />
              </TouchableOpacity>
            </View>
          ) : (
            <GlassPanel style={styles.emptyShell}>
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Complete activities to unlock achievements.
                </Text>
              </View>
            </GlassPanel>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Charts</Text>
          <Text style={styles.sectionTitle}>Performance trends</Text>

          <WeeklyProgressChart
            data={volumeProgression.distances}
            labels={volumeProgression.labels}
            title="Weekly Distance Progress"
            color="#57B8FF"
          />

          <MonthlyVolumeChart
            distances={analytics.monthlyDistance}
            durations={volumeProgression.durations}
            labels={['6mo', '5mo', '4mo', '3mo', '2mo', '1mo']}
          />

          <PaceDistributionChart zones={paceZones} />
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

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
  }
  if (type === 'fastest_pace') {
    return formatPace(value);
  }
  if (type === 'longest_distance') {
    return `${formatDistance(value)} km`;
  }
  if (type === 'longest_duration') {
    return formatDuration(value);
  }
  if (type === 'most_calories') {
    return `${value.toFixed(0)} kcal`;
  }
  return value.toString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081223',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  cloudTop: {
    position: 'absolute',
    top: 24,
    right: -32,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(103, 230, 255, 0.14)',
  },
  cloudBottom: {
    position: 'absolute',
    bottom: 120,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(166, 28, 40, 0.14)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#081223',
  },
  loadingText: {
    color: '#D6E3F2',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: UI_FONT,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  heroShell: {
    marginBottom: 16,
  },
  heroCard: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroEyebrow: {
    color: '#F5C15D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: UI_FONT,
  },
  heroTitle: {
    color: '#F4F8FF',
    fontSize: 31,
    marginTop: 4,
    fontFamily: TITLE_FONT,
  },
  heroSubtitle: {
    color: '#9AB5D1',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: '88%',
    fontFamily: UI_FONT,
  },
  syncButton: {
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: '#A61C28',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  heroStat: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  heroStatValue: {
    color: '#F3F8FF',
    fontSize: 20,
    fontFamily: TITLE_FONT,
  },
  heroStatLabel: {
    color: '#9AB5D1',
    fontSize: 12,
    marginTop: 3,
    fontFamily: UI_FONT,
  },
  timeframeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.16)',
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: '#A61C28',
  },
  timeframeButtonText: {
    color: '#9AB5D1',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: UI_FONT,
  },
  timeframeButtonTextActive: {
    color: '#FFF1D8',
    fontFamily: UI_FONT,
  },
  section: {
    marginBottom: 24,
  },
  sectionEyebrow: {
    color: '#F5C15D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: UI_FONT,
  },
  sectionTitle: {
    color: '#F4F8FF',
    fontSize: 26,
    marginBottom: 14,
    fontFamily: TITLE_FONT,
  },
  statsGrid: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  progressShell: {
    marginTop: 2,
  },
  progressCard: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  progressRingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  progressRingItem: {
    alignItems: 'center',
  },
  progressRingContent: {
    alignItems: 'center',
  },
  progressRingValue: {
    color: '#F4F8FF',
    fontSize: 16,
    fontFamily: TITLE_FONT,
  },
  progressRingLabel: {
    color: '#9AB5D1',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    fontFamily: UI_FONT,
  },
  recordsGrid: {
    gap: 12,
  },
  emptyShell: {
    marginTop: 2,
  },
  emptyState: {
    padding: 26,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#9AB5D1',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: UI_FONT,
  },
  achievementsContainer: {
    gap: 12,
  },
  achievementShell: {
    marginBottom: 0,
  },
  achievementCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    color: '#90A1B5',
    fontSize: 16,
    marginBottom: 4,
    fontFamily: TITLE_FONT,
  },
  achievementTitleUnlocked: {
    color: '#F4F8FF',
    fontFamily: TITLE_FONT,
  },
  achievementDescription: {
    color: '#9AB5D1',
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 18,
    fontFamily: UI_FONT,
  },
  achievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  achievementProgressBar: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: '#67E6FF',
    borderRadius: 999,
  },
  achievementProgressText: {
    color: '#9AB5D1',
    fontSize: 10,
    minWidth: 30,
    fontFamily: UI_FONT,
  },
  achievementUnlockedDate: {
    color: '#9AB5D1',
    fontSize: 10,
    fontFamily: UI_FONT,
  },
  achievementBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD98C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4FAFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    gap: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#DCEAF5',
  },
  viewMoreText: {
    color: '#0D4D7A',
    fontSize: 14,
    fontWeight: '800',
  },
  bottomSpacing: {
    height: 100,
  },
});

export default Analytics;
