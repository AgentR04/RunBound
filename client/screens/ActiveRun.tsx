import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MapView, {
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { ActiveRun as ActiveRunType, Territory } from '../types/game';
import {
  calculateCalories,
  calculatePace,
  calculatePathDistance,
  calculateSpeed,
  LocationPoint,
} from '../utils/gpsTracking';
import {
  calculatePolygonArea,
  getPolygonCenter,
  isNearStartPoint,
  simplifyPolygon,
} from '../utils/territoryUtils';

const HEADER_FONT = Platform.select({
  ios: 'AvenirNextCondensed-Heavy',
  android: 'sans-serif-condensed',
  default: undefined,
});
const DEFAULT_MUMBAI_REGION = {
  latitude: 19.076,
  longitude: 72.8777,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};
const TACTICAL_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#EDF7FF' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5F7A97' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#C9DCEC' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#F6FBFF' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#EEF7E9' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#FFE7B3' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#BEE8FF' }],
  },
];

interface ActiveRunScreenProps {
  navigation: any;
  route: {
    params: {
      initialActiveRun: ActiveRunType;
      targetTerritory?: Territory | null;
      onPause: () => void;
      onResume: () => void;
      onStop: () => void;
      onClaim: () => void;
      onRunUpdate: (run: ActiveRunType) => void;
    };
  };
}

function hashString(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 2147483647;
  }

  return Math.abs(hash);
}

function getTerritoryName(territory?: Territory | null) {
  if (!territory) {
    return 'Mumbai Free Run';
  }

  const prefixes = [
    'Bandra',
    'Dadar',
    'Worli',
    'Colaba',
    'Powai',
    'Mahim',
    'Chembur',
    'Versova',
  ];
  const suffixes = [
    'Seaface',
    'Maidan',
    'Naka',
    'Marg',
    'Khadi',
    'Depot',
    'Point',
    'Circle',
  ];
  const hash = hashString(territory.id);
  return `${prefixes[hash % prefixes.length]} ${
    suffixes[Math.floor(hash / 7) % suffixes.length]
  }`;
}

function getSignalState(speed: string, currentLocation: LocationPoint | undefined) {
  const numericSpeed = parseFloat(speed);
  const accuracy = currentLocation?.accuracy ?? 0;
  const suspicious = numericSpeed > 25 || accuracy > 40;

  return {
    suspicious,
    label: suspicious ? 'Anomaly detected' : 'Valid sweep',
    detail: suspicious
      ? 'Speed or GPS drift is outside raid rules.'
      : 'Speed and GPS stay within raid rules.',
  };
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

const ActiveRunScreen: React.FC<ActiveRunScreenProps> = ({
  navigation,
  route,
}) => {
  const {
    initialActiveRun,
    targetTerritory,
    onPause,
    onResume,
    onStop,
    onClaim,
    onRunUpdate,
  } = route.params;
  const [activeRun, setActiveRun] = useState(initialActiveRun);
  const [timer, setTimer] = useState(0);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    onRunUpdate(activeRun);
  }, [activeRun, onRunUpdate]);

  useEffect(() => {
    if (activeRun.state === 'running') {
      timerInterval.current = setInterval(() => {
        setTimer(previous => previous + 1);
      }, 1000);
    } else if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    };
  }, [activeRun.state]);

  useEffect(() => {
    const currentLocation = activeRun.path[activeRun.path.length - 1];
    if (currentLocation && mapRef.current && activeRun.state === 'running') {
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        450,
      );
    }
  }, [activeRun.path, activeRun.state]);

  const distance = activeRun.distance;
  const minimumDistance = 0.005;
  const pace =
    distance > minimumDistance ? calculatePace(distance, timer) : '0\'00"';
  const speed =
    distance > minimumDistance
      ? calculateSpeed(distance, timer).toFixed(1)
      : '0.0';
  const calories = calculateCalories(distance);
  const currentLocation = activeRun.path[activeRun.path.length - 1];
  const isNearStart =
    activeRun.path.length > 10 && currentLocation
      ? isNearStartPoint(currentLocation, activeRun.path[0])
      : false;
  const previewBoundary =
    activeRun.path.length > 2
      ? simplifyPolygon(activeRun.path)
      : activeRun.path;
  const territoryCenter = targetTerritory
    ? getPolygonCenter(targetTerritory.boundary)
    : currentLocation;
  const territoriesInRange = territoryCenter ? 1 : 0;
  const estimatedArea =
    previewBoundary.length > 2 ? calculatePolygonArea(previewBoundary) : 0;
  const progressRatio = Math.min(distance / 1, 1);
  const progressPercent = Math.round(progressRatio * 100);
  const targetName = getTerritoryName(targetTerritory);
  const signal = getSignalState(speed, currentLocation);

  const handlePause = () => {
    setActiveRun(previous => ({ ...previous, state: 'paused' }));
    onPause();
  };

  const handleResume = () => {
    setActiveRun(previous => ({ ...previous, state: 'running' }));
    onResume();
  };

  const handleStop = () => {
    Alert.alert(
      'Abort Sweep?',
      'Stopping now ends the raid and you will lose this loop unless you have already claimed it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Run',
          style: 'destructive',
          onPress: () => {
            onStop();
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleClaim = () => {
    if (activeRun.path.length < 10) {
      Alert.alert(
        'Blob Too Small',
        'Keep moving a little longer to carve a valid territory loop.',
      );
      return;
    }

    if (!isNearStart) {
      Alert.alert(
        'Loop Incomplete',
        'Return close to your starting point to lock this territory.',
      );
      return;
    }

    onClaim();
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#EAF7FF" />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={TACTICAL_MAP_STYLE}
        initialRegion={{
          latitude:
            activeRun.path[0]?.latitude || DEFAULT_MUMBAI_REGION.latitude,
          longitude:
            activeRun.path[0]?.longitude || DEFAULT_MUMBAI_REGION.longitude,
          latitudeDelta: DEFAULT_MUMBAI_REGION.latitudeDelta,
          longitudeDelta: DEFAULT_MUMBAI_REGION.longitudeDelta,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        followsUserLocation={activeRun.state === 'running'}
        onUserLocationChange={event => {
          const { coordinate } = event.nativeEvent;
          if (!coordinate || activeRun.state !== 'running') {
            return;
          }

          const location: LocationPoint = {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            timestamp: Date.now(),
            accuracy: coordinate.accuracy,
            altitude: coordinate.altitude ?? undefined,
            speed: coordinate.speed ?? undefined,
          };

          setActiveRun(previous => {
            const nextPath = [...previous.path, location];
            const nextDistance = calculatePathDistance(nextPath);
            const nearLoop =
              previous.path.length > 10 &&
              isNearStartPoint(location, previous.path[0]);

            return {
              ...previous,
              path: nextPath,
              distance: nextDistance,
              isNearStart: nearLoop,
            };
          });
        }}
      >
        {targetTerritory && targetTerritory.boundary.length > 2 && (
          <Polygon
            coordinates={targetTerritory.boundary}
            fillColor="rgba(255, 139, 94, 0.12)"
            strokeColor="rgba(255, 139, 94, 0.56)"
            strokeWidth={2}
          />
        )}

        {previewBoundary.length > 2 && (
          <Polygon
            coordinates={previewBoundary}
            fillColor={
              isNearStart
                ? 'rgba(87, 184, 255, 0.24)'
                : 'rgba(87, 184, 255, 0.12)'
            }
            strokeColor={isNearStart ? '#F2A12D' : '#57B8FF'}
            strokeWidth={2.5}
          />
        )}

        {activeRun.path.length > 1 && (
          <Polyline
            coordinates={activeRun.path}
            strokeColor={isNearStart ? '#F2A12D' : '#57B8FF'}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(190, 232, 255, 0.38)',
          'rgba(255, 255, 255, 0.04)',
          'rgba(255, 243, 224, 0.44)',
        ]}
        style={styles.mapAtmosphere}
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Icon name="chevron-down" size={24} color="#2D4663" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>Live Conquest</Text>
          <Text style={styles.headerTitle}>
            {activeRun.state === 'running' ? 'Territory Sweep' : 'Sweep Paused'}
          </Text>
        </View>

        <View
          style={[
            styles.signalPill,
            signal.suspicious ? styles.signalPillAlert : styles.signalPillSafe,
          ]}
        >
          <Icon
            name={signal.suspicious ? 'warning-outline' : 'shield-checkmark'}
            size={15}
            color={signal.suspicious ? '#FF8B5E' : '#60C676'}
          />
          <Text style={styles.signalPillText}>
            {signal.suspicious ? 'Alert' : 'Valid'}
          </Text>
        </View>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{distance.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatTime(timer)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{speed}</Text>
          <Text style={styles.statLabel}>Speed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{territoriesInRange}</Text>
          <Text style={styles.statLabel}>In Range</Text>
        </View>
      </View>

      <View style={styles.drawer}>
        <View style={styles.drawerHandle} />
        <Text style={styles.drawerEyebrow}>Capture Drawer</Text>

        <View style={styles.drawerHeader}>
          <View>
            <Text style={styles.drawerTitle}>{targetName}</Text>
            <Text style={styles.drawerSubtitle}>
              {targetTerritory
                ? `Owner: ${targetTerritory.ownerName}`
                : 'Freeform Mumbai raid path'}
            </Text>
          </View>
          <View
            style={[
              styles.captureBadge,
              isNearStart ? styles.captureBadgeReady : styles.captureBadgeIdle,
            ]}
          >
            <Text style={styles.captureBadgeText}>
              {isNearStart ? 'Ready' : `${progressPercent}%`}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(progressPercent, isNearStart ? 100 : 4)}%` },
            ]}
          />
        </View>

        <View style={styles.drawerMetrics}>
          <View style={styles.drawerMetric}>
            <Icon name="shapes-outline" size={16} color="#57B8FF" />
            <Text style={styles.drawerMetricValue}>
              {(estimatedArea * 1_000_000).toFixed(0)} m²
            </Text>
            <Text style={styles.drawerMetricLabel}>Blob</Text>
          </View>
          <View style={styles.drawerMetric}>
            <Icon name="flash-outline" size={16} color="#F2A12D" />
            <Text style={styles.drawerMetricValue}>+{Math.round(distance * 90)}</Text>
            <Text style={styles.drawerMetricLabel}>XP</Text>
          </View>
          <View style={styles.drawerMetric}>
            <Icon name="timer-outline" size={16} color="#FF8B5E" />
            <Text style={styles.drawerMetricValue}>{pace}</Text>
            <Text style={styles.drawerMetricLabel}>Pace</Text>
          </View>
        </View>

        <View style={styles.rulesCard}>
          <View style={styles.rulesHeader}>
            <Icon
              name={signal.suspicious ? 'warning-outline' : 'shield-checkmark'}
              size={18}
              color={signal.suspicious ? '#FF8B5E' : '#60C676'}
            />
            <Text style={styles.rulesTitle}>{signal.label}</Text>
          </View>
          <Text style={styles.rulesText}>{signal.detail}</Text>
          <Text style={styles.rulesText}>
            Raid rule: loop at least 1 km and keep average speed under 25 km/h.
          </Text>
          <Text style={styles.rulesText}>Energy burned so far: {calories} kcal.</Text>
        </View>

        {isNearStart && (
          <TouchableOpacity style={styles.claimButton} onPress={handleClaim}>
            <Icon name="trophy" size={20} color="#101114" />
            <Text style={styles.claimButtonText}>Lock Territory</Text>
          </TouchableOpacity>
        )}

        <View style={styles.controlsRow}>
          {activeRun.state === 'running' ? (
            <TouchableOpacity style={styles.pauseButton} onPress={handlePause}>
              <Icon name="pause" size={26} color="#F8FBFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.resumeButton} onPress={handleResume}>
              <Icon name="play" size={26} color="#101114" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
            <Icon name="stop" size={26} color="#F8FBFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF7FF',
  },
  map: {
    flex: 1,
  },
  mapAtmosphere: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 10 : 52,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(200, 223, 239, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerEyebrow: {
    color: '#D58A15',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#2A4361',
    fontSize: 26,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
    marginTop: 2,
  },
  signalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  signalPillSafe: {
    backgroundColor: 'rgba(96, 198, 118, 0.14)',
    borderColor: 'rgba(96, 198, 118, 0.28)',
  },
  signalPillAlert: {
    backgroundColor: 'rgba(255, 139, 94, 0.14)',
    borderColor: 'rgba(255, 139, 94, 0.28)',
  },
  signalPillText: {
    color: '#5F7996',
    fontSize: 12,
    fontWeight: '800',
  },
  statsBar: {
    position: 'absolute',
    top:
      (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 10 : 52) +
      72,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(214, 232, 244, 0.95)',
  },
  statValue: {
    color: '#2A4361',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
  },
  statLabel: {
    color: '#7990AB',
    fontSize: 10,
    marginTop: 3,
    textTransform: 'uppercase',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 250, 243, 0.98)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(241, 219, 182, 0.8)',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 30,
  },
  drawerHandle: {
    width: 58,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(242, 161, 45, 0.45)',
    alignSelf: 'center',
  },
  drawerEyebrow: {
    alignSelf: 'center',
    marginTop: 10,
    color: '#D58A15',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  drawerHeader: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerTitle: {
    color: '#2A4361',
    fontSize: 28,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
  },
  drawerSubtitle: {
    color: '#7A90A9',
    fontSize: 12,
    marginTop: 4,
  },
  captureBadge: {
    minWidth: 74,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
  },
  captureBadgeReady: {
    backgroundColor: '#FFD98C',
  },
  captureBadgeIdle: {
    backgroundColor: '#F3F8FF',
    borderWidth: 1,
    borderColor: '#E0EDF7',
  },
  captureBadgeText: {
    color: '#7A5010',
    fontSize: 14,
    fontWeight: '900',
  },
  progressTrack: {
    marginTop: 16,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#EAF2F9',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#57B8FF',
  },
  drawerMetrics: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  drawerMetric: {
    flex: 1,
    backgroundColor: '#F7FBFF',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1EEF8',
  },
  drawerMetricValue: {
    color: '#2A4361',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
    marginTop: 4,
  },
  drawerMetricLabel: {
    color: '#7A90A9',
    fontSize: 11,
    marginTop: 3,
  },
  rulesCard: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: '#F6FAFF',
    borderWidth: 1,
    borderColor: '#E1EEF8',
    padding: 14,
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rulesTitle: {
    color: '#2A4361',
    fontSize: 14,
    fontWeight: '800',
  },
  rulesText: {
    color: '#748CA8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  claimButton: {
    marginTop: 16,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FFD98C',
    borderWidth: 2,
    borderColor: '#FFF0C5',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  claimButtonText: {
    color: '#7A5010',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  controlsRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  pauseButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFB28E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#AEE4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FF8B5E',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ActiveRunScreen;
