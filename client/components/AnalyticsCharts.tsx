import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { TITLE_FONT, UI_FONT } from '../theme/fonts';

const { width: screenWidth } = Dimensions.get('window');
const CHART_WIDTH = screenWidth - 48;
const CHART_HEIGHT = 180;

function formatCompactValue(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

function SimpleColumnChart({
  values,
  labels,
  color,
}: {
  values: number[];
  labels: string[];
  color: string;
}) {
  const safeValues = values.length > 0 ? values : [0];
  const maxValue = Math.max(...safeValues, 1);

  return (
    <View style={styles.columnChartWrap}>
      <View style={styles.chartGrid}>
        {safeValues.map((value, index) => {
          const heightPercent = Math.max((value / maxValue) * 100, value > 0 ? 12 : 4);
          return (
            <View key={`${labels[index] ?? index}`} style={styles.columnSlot}>
              <Text style={styles.columnValue}>{formatCompactValue(value)}</Text>
              <View style={styles.columnTrack}>
                <View
                  style={[
                    styles.columnFill,
                    {
                      backgroundColor: color,
                      height: `${heightPercent}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.columnLabel} numberOfLines={1}>
                {labels[index] ?? ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function TrendBars({
  values,
  color,
}: {
  values: number[];
  color: string;
}) {
  const safeValues = values.length > 0 ? values : [0];
  const maxValue = Math.max(...safeValues, 1);

  return (
    <View style={styles.trendBars}>
      {safeValues.map((value, index) => (
        <View key={`${value}-${index}`} style={styles.trendBarSlot}>
          <View
            style={[
              styles.trendBar,
              {
                backgroundColor: color,
                opacity: 0.35 + (value / maxValue) * 0.65,
                height: 28 + (value / maxValue) * 80,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

interface WeeklyProgressChartProps {
  data: number[];
  labels: string[];
  title: string;
  color?: string;
}

export const WeeklyProgressChart: React.FC<WeeklyProgressChartProps> = ({
  data,
  labels,
  title,
  color = '#57B8FF',
}) => {
  const trimmedData = data.slice(-8);
  const trimmedLabels = labels.slice(-8);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <TrendBars values={trimmedData} color={color} />
      <SimpleColumnChart values={trimmedData} labels={trimmedLabels} color={color} />
    </View>
  );
};

interface PaceDistributionChartProps {
  zones: {
    zone1: number;
    zone2: number;
    zone3: number;
    zone4: number;
    zone5: number;
    zone6: number;
  };
}

export const PaceDistributionChart: React.FC<PaceDistributionChartProps> = ({
  zones,
}) => {
  const data = [
    { name: 'Recovery', value: zones.zone1, color: '#57B8FF' },
    { name: 'Easy', value: zones.zone2, color: '#60C676' },
    { name: 'Tempo', value: zones.zone3, color: '#F7B733' },
    { name: 'Threshold', value: zones.zone4, color: '#F2A12D' },
    { name: 'VO2 Max', value: zones.zone5, color: '#FF8B5E' },
    { name: 'Speed', value: zones.zone6, color: '#FF5F6D' },
  ].filter(zone => zone.value > 0);

  const total = data.reduce((sum, zone) => sum + zone.value, 0);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Pace Zone Distribution</Text>
      {data.length > 0 ? (
        <View style={styles.zoneList}>
          {data.map(zone => {
            const percentage = total > 0 ? (zone.value / total) * 100 : 0;
            return (
              <View key={zone.name} style={styles.zoneRow}>
                <View style={styles.zoneHeader}>
                  <View style={styles.zoneNameWrap}>
                    <View
                      style={[styles.zoneDot, { backgroundColor: zone.color }]}
                    />
                    <Text style={styles.zoneName}>{zone.name}</Text>
                  </View>
                  <Text style={styles.zonePercent}>{Math.round(percentage)}%</Text>
                </View>
                <View style={styles.zoneTrack}>
                  <View
                    style={[
                      styles.zoneFill,
                      {
                        width: `${Math.max(percentage, 6)}%`,
                        backgroundColor: zone.color,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No pace data available</Text>
        </View>
      )}
    </View>
  );
};

interface MonthlyVolumeChartProps {
  distances: number[];
  durations: number[];
  labels: string[];
}

export const MonthlyVolumeChart: React.FC<MonthlyVolumeChartProps> = ({
  distances,
  labels,
}) => {
  const trimmedData = distances.slice(-6);
  const trimmedLabels = labels.slice(-6);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Monthly Distance (km)</Text>
      <SimpleColumnChart
        values={trimmedData}
        labels={trimmedLabels}
        color="#F2A12D"
      />
    </View>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = '#57B8FF',
  trend,
  trendValue,
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return '#60C676';
      case 'down':
        return '#FF8B5E';
      default:
        return '#8BA0B7';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      default:
        return '→';
    }
  };

  return (
    <View style={[styles.statCard, { borderColor: `${color}55` }]}>
      <View style={styles.statCardHeader}>
        {icon ? <View style={styles.statCardIcon}>{icon}</View> : null}
        <Text style={styles.statCardTitle}>{title}</Text>
      </View>

      <Text style={[styles.statCardValue, { color }]}>{value}</Text>

      {subtitle ? <Text style={styles.statCardSubtitle}>{subtitle}</Text> : null}

      {trend && trendValue ? (
        <View style={styles.trendContainer}>
          <Text style={[styles.trendText, { color: getTrendColor() }]}>
            {getTrendIcon()} {trendValue}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

interface PersonalRecordCardProps {
  title: string;
  value: string;
  date: string;
  isNewRecord?: boolean;
}

export const PersonalRecordCard: React.FC<PersonalRecordCardProps> = ({
  title,
  value,
  date,
  isNewRecord = false,
}) => {
  return (
    <View style={[styles.recordCard, isNewRecord && styles.newRecordCard]}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordTitle}>{title}</Text>
        {isNewRecord ? (
          <View style={styles.newRecordBadge}>
            <Text style={styles.newRecordText}>NEW!</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.recordValue}>{value}</Text>
      <Text style={styles.recordDate}>{date}</Text>
    </View>
  );
};

interface ProgressRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size,
  strokeWidth,
  color,
  backgroundColor = 'rgba(255,255,255,0.1)',
  children,
}) => {
  return (
    <View style={[styles.progressRing, { width: size, height: size }]}>
      <View style={styles.progressRingInner}>{children}</View>
      <View style={StyleSheet.absoluteFillObject}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
          }}
        />
      </View>
      <View style={StyleSheet.absoluteFillObject}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'transparent',
            borderTopColor: color,
            opacity: Math.max(progress / 100, 0.24),
            transform: [{ rotate: '-90deg' }],
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: 'rgba(10, 20, 36, 0.96)',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(166, 28, 40, 0.34)',
  },
  chartTitle: {
    color: '#F4F8FF',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: TITLE_FONT,
  },
  chartGrid: {
    width: CHART_WIDTH,
    minHeight: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  columnChartWrap: {
    alignItems: 'center',
  },
  columnSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  columnValue: {
    color: '#9AB5D1',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: UI_FONT,
  },
  columnTrack: {
    width: '100%',
    minHeight: 96,
    height: CHART_HEIGHT * 0.65,
    justifyContent: 'flex-end',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    padding: 4,
  },
  columnFill: {
    width: '100%',
    borderRadius: 12,
    minHeight: 10,
  },
  columnLabel: {
    color: '#A6BED6',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    fontFamily: UI_FONT,
  },
  trendBars: {
    height: 90,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  trendBarSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  trendBar: {
    width: '70%',
    borderRadius: 999,
  },
  zoneList: {
    gap: 12,
  },
  zoneRow: {
    gap: 8,
  },
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  zoneNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoneDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  zoneName: {
    color: '#F4F8FF',
    fontSize: 14,
    fontFamily: TITLE_FONT,
  },
  zonePercent: {
    color: '#9AB5D1',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: UI_FONT,
  },
  zoneTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  zoneFill: {
    height: '100%',
    borderRadius: 999,
    minWidth: 12,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: '#9AB5D1',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: UI_FONT,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(10, 20, 36, 0.96)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardIcon: {
    marginRight: 8,
  },
  statCardTitle: {
    color: '#9AB5D1',
    fontSize: 13,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontFamily: UI_FONT,
  },
  statCardValue: {
    fontSize: 30,
    marginBottom: 4,
    fontFamily: TITLE_FONT,
  },
  statCardSubtitle: {
    color: '#9AB5D1',
    fontSize: 12,
    fontFamily: UI_FONT,
  },
  trendContainer: {
    marginTop: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: UI_FONT,
  },
  recordCard: {
    backgroundColor: 'rgba(10, 20, 36, 0.96)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(166, 28, 40, 0.34)',
  },
  newRecordCard: {
    borderColor: '#F5C15D',
    backgroundColor: 'rgba(245, 193, 93, 0.14)',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordTitle: {
    color: '#F4F8FF',
    fontSize: 16,
    fontFamily: TITLE_FONT,
  },
  newRecordBadge: {
    backgroundColor: '#A61C28',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  newRecordText: {
    color: '#FFF1D8',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: UI_FONT,
  },
  recordValue: {
    color: '#57B8FF',
    fontSize: 24,
    marginBottom: 4,
    fontFamily: TITLE_FONT,
  },
  recordDate: {
    color: '#9AB5D1',
    fontSize: 12,
    fontFamily: UI_FONT,
  },
  progressRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingInner: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});
