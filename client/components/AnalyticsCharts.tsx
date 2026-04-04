import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';

const { width: screenWidth } = Dimensions.get('window');

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
  color = '#52FF30',
}) => {
  const chartConfig = {
    backgroundColor: '#1F1F1D',
    backgroundGradientFrom: '#1F1F1D',
    backgroundGradientTo: '#1F1F1D',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(82, 255, 48, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.8})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: color,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: 'rgba(255, 255, 255, 0.1)',
    },
  };

  const chartData = {
    labels: labels.slice(-8), // Show last 8 weeks
    datasets: [
      {
        data: data.slice(-8),
        color: (opacity = 1) => `rgba(82, 255, 48, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <LineChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
      />
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
    {
      name: 'Recovery',
      population: zones.zone1,
      color: '#4ADED0',
      legendFontColor: '#FFF',
      legendFontSize: 12,
    },
    {
      name: 'Easy',
      population: zones.zone2,
      color: '#52FF30',
      legendFontColor: '#FFF',
      legendFontSize: 12,
    },
    {
      name: 'Tempo',
      population: zones.zone3,
      color: '#FFD700',
      legendFontColor: '#FFF',
      legendFontSize: 12,
    },
    {
      name: 'Threshold',
      population: zones.zone4,
      color: '#FF9500',
      legendFontColor: '#FFF',
      legendFontSize: 12,
    },
    {
      name: 'VO2 Max',
      population: zones.zone5,
      color: '#FF6B35',
      legendFontColor: '#FFF',
      legendFontSize: 12,
    },
    {
      name: 'Speed',
      population: zones.zone6,
      color: '#FF3B30',
      legendFontColor: '#FFF',
      legendFontSize: 12,
    },
  ].filter(zone => zone.population > 0); // Only show zones with data

  const chartConfig = {
    backgroundColor: '#1F1F1D',
    backgroundGradientFrom: '#1F1F1D',
    backgroundGradientTo: '#1F1F1D',
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Pace Zone Distribution</Text>
      {data.length > 0 ? (
        <PieChart
          data={data}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[10, 10]}
          absolute
        />
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
  durations,
  labels,
}) => {
  const chartConfig = {
    backgroundColor: '#1F1F1D',
    backgroundGradientFrom: '#1F1F1D',
    backgroundGradientTo: '#1F1F1D',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(82, 255, 48, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.8})`,
    style: {
      borderRadius: 16,
    },
    propsForBars: {
      radius: 4,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: 'rgba(255, 255, 255, 0.1)',
    },
  };

  const chartData = {
    labels: labels.slice(-6), // Show last 6 months
    datasets: [
      {
        data: distances.slice(-6),
        color: (opacity = 1) => `rgba(82, 255, 48, ${opacity})`,
      },
    ],
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Monthly Distance (km)</Text>
      <BarChart
        data={chartData}
        width={screenWidth - 32}
        height={220}
        chartConfig={chartConfig}
        style={styles.chart}
        yAxisSuffix="km"
        fromZero
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
  color = '#52FF30',
  trend,
  trendValue,
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return '#52FF30';
      case 'down':
        return '#FF3B30';
      default:
        return '#888';
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
    <View style={[styles.statCard, { borderColor: color }]}>
      <View style={styles.statCardHeader}>
        {icon && <View style={styles.statCardIcon}>{icon}</View>}
        <Text style={styles.statCardTitle}>{title}</Text>
      </View>

      <Text style={[styles.statCardValue, { color }]}>{value}</Text>

      {subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}

      {trend && trendValue && (
        <View style={styles.trendContainer}>
          <Text style={[styles.trendText, { color: getTrendColor() }]}>
            {getTrendIcon()} {trendValue}
          </Text>
        </View>
      )}
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
        {isNewRecord && (
          <View style={styles.newRecordBadge}>
            <Text style={styles.newRecordText}>NEW!</Text>
          </View>
        )}
      </View>
      <Text style={styles.recordValue}>{value}</Text>
      <Text style={styles.recordDate}>{date}</Text>
    </View>
  );
};

interface ProgressRingProps {
  progress: number; // 0-100
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
  backgroundColor = '#333',
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[styles.progressRing, { width: size, height: size }]}>
      <View style={styles.progressRingInner}>{children}</View>
      {/* Background circle */}
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
      {/* Progress arc */}
      <View style={StyleSheet.absoluteFillObject}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'transparent',
            borderTopColor: color,
            transform: [{ rotate: '-90deg' }],
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#1F1F1D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: '#888',
    fontSize: 16,
  },
  statCard: {
    backgroundColor: '#1F1F1D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
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
    color: '#888',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  statCardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statCardSubtitle: {
    color: '#aaa',
    fontSize: 12,
  },
  trendContainer: {
    marginTop: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordCard: {
    backgroundColor: '#1F1F1D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  newRecordCard: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  newRecordBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newRecordText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  recordValue: {
    color: '#52FF30',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recordDate: {
    color: '#888',
    fontSize: 12,
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
