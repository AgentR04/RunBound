import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
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
import { upsertUserProfile } from '../services/api';
import {
  emitRunEnded,
  emitRunLocation,
  emitRunStarted,
} from '../services/socket';
import { updateLocalUserRewards } from '../utils/storage';
import {
  calculateCalories,
  calculatePathDistance,
  LocationPoint,
} from '../utils/gpsTracking';
import {
  calculatePolygonArea,
  getPolygonCenter,
  isNearStartPoint,
  simplifyPolygon,
} from '../utils/territoryUtils';
import { STAT_FONT, TITLE_FONT, UI_FONT } from '../theme/fonts';

const DropMarker = require('../src/components/run/DropMarker').default;
const DropsHUD = require('../src/components/run/DropsHUD').default;
const {
  advancePathRewards,
  getPathRewardHudState,
  hydratePathRewardState,
  syncTimedPathRewardState,
} = require('../src/engines/DropEngine');

const HEADER_FONT = TITLE_FONT;
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

interface ActiveRunRouteParams {
  initialActiveRun: ActiveRunType;
  targetTerritory?: Territory | null;
  runnerProfile: {
    id: string;
    username: string;
    color?: string;
  };
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onClaim: () => void;
  onRunUpdate: (run: ActiveRunType) => void;
}

interface PickupEffect {
  id: string;
  label: string;
  x: number;
  y: number;
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

function estimateSteps(distanceKm: number): number {
  return Math.max(0, Math.round(distanceKm * 1312));
}

function FloatingRewardText({ effect }: { effect: PickupEffect }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      duration: 900,
      easing: Easing.out(Easing.quad),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.floatingReward,
        {
          left: effect.x,
          top: effect.y,
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -34],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.floatingRewardText}>{effect.label}</Text>
    </Animated.View>
  );
}

const ActiveRunScreen = ({ navigation, route }: any) => {
  const {
    initialActiveRun,
    targetTerritory,
    runnerProfile,
    onPause,
    onResume,
    onStop,
    onClaim,
    onRunUpdate,
  } = route.params as ActiveRunRouteParams;
  const hydratedInitialRun = hydratePathRewardState(initialActiveRun);
  const [activeRun, setActiveRun] = useState<ActiveRunType>(hydratedInitialRun);
  const activeRunRef = useRef<ActiveRunType>(hydratedInitialRun);
  const [timer, setTimer] = useState(0);
  const [pickupEffects, setPickupEffects] = useState<PickupEffect[]>([]);
  const [ghostBannerVisible, setGhostBannerVisible] = useState(false);
  const [hudFlashKey, setHudFlashKey] = useState(0);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(true);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<MapView>(null);
  const ghostBannerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickupTimeouts = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const didEmitRunStart = useRef(false);
  const ghostBannerOpacity = useRef(new Animated.Value(0)).current;

  const commitActiveRun = useCallback((nextRun: ActiveRunType) => {
    activeRunRef.current = nextRun;
    setActiveRun(nextRun);
  }, []);

  const removePickupEffect = (effectId: string) => {
    setPickupEffects(previous =>
      previous.filter(effect => effect.id !== effectId),
    );
  };

  const showPickupEffect = useCallback(async (
    effectId: string,
    label: string,
    latitude: number,
    longitude: number,
  ) => {
    try {
      const point = await mapRef.current?.pointForCoordinate({
        latitude,
        longitude,
      });

      if (!point) {
        return;
      }

      setPickupEffects(previous => [
        ...previous,
        {
          id: effectId,
          label,
          x: point.x - 48,
          y: point.y - 32,
        },
      ]);

      const timeout = setTimeout(() => removePickupEffect(effectId), 1025);
      pickupTimeouts.current.push(timeout);
    } catch (error) {
      console.warn('[drops] pickup effect failed:', error);
    }
  }, []);

  const persistUserRewardUpdate = useCallback(async (
    rewardDelta: {
      coinsDelta?: number;
      shieldDelta?: number;
      shieldExpiresAt?: number | null;
    },
  ) => {
    const hasProfileDelta =
      !!rewardDelta.coinsDelta ||
      !!rewardDelta.shieldDelta ||
      rewardDelta.shieldExpiresAt !== undefined;

    if (!hasProfileDelta) {
      return;
    }

    try {
      const updatedUser = await updateLocalUserRewards(runnerProfile, rewardDelta);

      await upsertUserProfile({
        id: runnerProfile.id,
        username: runnerProfile.username,
        color: runnerProfile.color,
        coins: updatedUser.coins,
        shieldCharges: updatedUser.shieldCharges,
        shieldActive: updatedUser.shieldActive,
        shieldExpiresAt: updatedUser.shieldExpiresAt
          ? new Date(updatedUser.shieldExpiresAt).toISOString()
          : null,
      });
    } catch (error) {
      console.warn('[drops] reward sync failed:', error);
    }
  }, [runnerProfile]);

  const handleRewardEvents = useCallback((events: Array<any>) => {
    events.forEach(event => {
      if (event.type === 'collected') {
        const { drop, collectedDrop, rewardDelta } = event;

        showPickupEffect(
          collectedDrop.id,
          collectedDrop.rewardText,
          drop.coordinate.latitude,
          drop.coordinate.longitude,
        ).catch(error => console.warn('[drops] pickup effect failed:', error));

        if (drop.type === 'ghost_mode') {
          setGhostBannerVisible(true);
          ghostBannerOpacity.setValue(0);
          Animated.timing(ghostBannerOpacity, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start();
          if (ghostBannerTimeout.current) {
            clearTimeout(ghostBannerTimeout.current);
          }
          ghostBannerTimeout.current = setTimeout(() => {
            Animated.timing(ghostBannerOpacity, {
              toValue: 0,
              duration: 260,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) {
                setGhostBannerVisible(false);
              }
            });
          }, 3000);
        }

        persistUserRewardUpdate(rewardDelta).catch(error =>
          console.warn('[drops] reward sync failed:', error),
        );
      }

      if (event.type === 'multiplier_expired') {
        setHudFlashKey(previous => previous + 1);
      }
    });
  }, [ghostBannerOpacity, persistUserRewardUpdate, showPickupEffect]);

  useEffect(() => {
    onRunUpdate(activeRun);
  }, [activeRun, onRunUpdate]);

  useEffect(() => {
    const startLocation = activeRun.path[0];

    if (!startLocation || activeRun.state !== 'running' || didEmitRunStart.current) {
      return;
    }

    didEmitRunStart.current = true;
    emitRunStarted({
      userId: runnerProfile.id,
      location: {
        latitude: startLocation.latitude,
        longitude: startLocation.longitude,
      },
      ghostUntil: activeRun.ghostUntil,
    });
  }, [activeRun.ghostUntil, activeRun.path, activeRun.state, runnerProfile.id]);

  useEffect(() => {
    if (activeRun.state === 'running' || activeRun.state === 'paused') {
      timerInterval.current = setInterval(() => {
        if (activeRunRef.current.state === 'running') {
          setTimer(previous => previous + 1);
        }

        const { run: nextRun, events } = syncTimedPathRewardState(
          activeRunRef.current,
          Date.now(),
        );

        commitActiveRun(nextRun);

        if (events.length > 0) {
          handleRewardEvents(events);
        }
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
      if (ghostBannerTimeout.current) {
        clearTimeout(ghostBannerTimeout.current);
        ghostBannerTimeout.current = null;
      }
      pickupTimeouts.current.forEach(timeout => clearTimeout(timeout));
      pickupTimeouts.current = [];
    };
  }, [activeRun.state, commitActiveRun, handleRewardEvents]);

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

  const handleLocationUpdate = (event: any) => {
    const { coordinate } = event.nativeEvent;
    const currentRun = activeRunRef.current;

    if (!coordinate || currentRun.state !== 'running') {
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
    const previousLocation = currentRun.path[currentRun.path.length - 1];
    const nextPath = [...currentRun.path, location];
    const nextDistance = calculatePathDistance(nextPath);
    const nearLoop =
      currentRun.path.length > 10 &&
      isNearStartPoint(location, currentRun.path[0]);
    const baseRun = {
      ...currentRun,
      path: nextPath,
      distance: nextDistance,
      isNearStart: nearLoop,
    };
    const { run: rewardRun, events } = advancePathRewards(
      baseRun,
      previousLocation,
      location,
      Date.now(),
    );

    commitActiveRun(rewardRun);
    emitRunLocation({
      userId: runnerProfile.id,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      ghostUntil: rewardRun.ghostUntil,
    });
    handleRewardEvents(events);
  };

  const distance = activeRun.distance;
  const steps = estimateSteps(distance);
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
  const signal = getSignalState('0.0', currentLocation);
  const rewardHud = getPathRewardHudState(activeRun, Date.now());
  const hasGhostMode = rewardHud.ghostActive;
  const projectedXp = Math.round(
    distance * 90 * (rewardHud.multiplierValue ?? 1),
  );

  const handlePause = () => {
    commitActiveRun({ ...activeRunRef.current, state: 'paused' });
    onPause();
  };

  const handleResume = () => {
    commitActiveRun({ ...activeRunRef.current, state: 'running' });
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
            emitRunEnded({ userId: runnerProfile.id });
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
    emitRunEnded({ userId: runnerProfile.id });
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
        onUserLocationChange={handleLocationUpdate}
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

        {activeRun.drops.map((drop: any) => (
          <DropMarker key={drop.id} drop={drop} />
        ))}
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

      {hasGhostMode && (
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(177, 226, 255, 0.2)',
            'rgba(12, 22, 40, 0.02)',
            'rgba(196, 238, 255, 0.24)',
          ]}
          style={styles.ghostVignette}
        />
      )}

      {pickupEffects.map(effect => (
        <FloatingRewardText key={effect.id} effect={effect} />
      ))}

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
          <Text style={styles.statValue}>{steps}</Text>
          <Text style={styles.statLabel}>Steps</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{territoriesInRange}</Text>
          <Text style={styles.statLabel}>In Range</Text>
        </View>
      </View>

      <DropsHUD
        dropsCollected={rewardHud.dropsCollected}
        coinsCollected={rewardHud.coinsCollected}
        multiplierValue={rewardHud.multiplierValue}
        multiplierRemainingMs={rewardHud.multiplierRemainingMs}
        ghostRemainingMs={rewardHud.ghostRemainingMs}
        flashKey={hudFlashKey}
      />

      {ghostBannerVisible && (
        <Animated.View
          style={[
            styles.ghostBanner,
            {
              opacity: ghostBannerOpacity,
              transform: [
                {
                  translateY: ghostBannerOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.ghostBannerText}>GHOST MODE ACTIVE</Text>
        </Animated.View>
      )}

      <View
        style={[
          styles.drawer,
          isDrawerCollapsed ? styles.drawerCollapsed : styles.drawerExpanded,
        ]}
      >
        <View style={styles.drawerHandle} />
        <View style={styles.drawerTopRow}>
          <Text style={styles.drawerEyebrow}>Avengers Frontline</Text>
          <TouchableOpacity
            style={styles.drawerToggle}
            onPress={() => setIsDrawerCollapsed(previous => !previous)}
          >
            <Text style={styles.drawerToggleText}>
              {isDrawerCollapsed ? 'Expand' : 'Collapse'}
            </Text>
            <Icon
              name={isDrawerCollapsed ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#F5C15D"
            />
          </TouchableOpacity>
        </View>

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
              {isNearStart ? 'Prime' : `${progressPercent}%`}
            </Text>
          </View>
        </View>

        {!isDrawerCollapsed && (
          <>
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
                <Text style={styles.drawerMetricValue}>+{projectedXp}</Text>
                <Text style={styles.drawerMetricLabel}>
                  {rewardHud.multiplierValue ? 'XP Boosted' : 'XP'}
                </Text>
              </View>
              <View style={styles.drawerMetric}>
                <Icon name="footsteps-outline" size={16} color="#FF8B5E" />
                <Text style={styles.drawerMetricValue}>{steps}</Text>
                <Text style={styles.drawerMetricLabel}>Steps</Text>
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
              <Text style={styles.rulesText}>
                Live steps: {steps}. Energy burned so far: {calories} kcal.
              </Text>
            </View>
          </>
        )}

        {isNearStart && (
          <TouchableOpacity style={styles.claimButton} onPress={handleClaim}>
            <Icon name="trophy" size={20} color="#FFF1D8" />
            <Text style={styles.claimButtonText}>Secure Sector</Text>
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
  ghostVignette: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingReward: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(9, 20, 37, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(245, 194, 79, 0.34)',
  },
  floatingRewardText: {
    color: '#F6D16B',
    fontSize: 13,
    fontWeight: '900',
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
    fontFamily: UI_FONT,
  },
  headerTitle: {
    color: '#2A4361',
    fontSize: 26,
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
    fontFamily: UI_FONT,
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
    fontFamily: STAT_FONT,
  },
  statLabel: {
    color: '#7990AB',
    fontSize: 10,
    marginTop: 3,
    textTransform: 'uppercase',
    fontFamily: UI_FONT,
  },
  ghostBanner: {
    position: 'absolute',
    top:
      (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 10 : 52) +
      132,
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(203, 238, 255, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(88, 184, 255, 0.38)',
  },
  ghostBannerText: {
    color: '#1B4A6B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 16, 31, 0.98)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(166, 28, 40, 0.42)',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  drawerCollapsed: {
    paddingBottom: 18,
  },
  drawerExpanded: {
    paddingBottom: 30,
  },
  drawerHandle: {
    width: 58,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(103, 230, 255, 0.45)',
    alignSelf: 'center',
  },
  drawerEyebrow: {
    color: '#F5C15D',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontFamily: UI_FONT,
  },
  drawerTopRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245, 193, 93, 0.24)',
  },
  drawerToggleText: {
    color: '#F5C15D',
    fontSize: 12,
    fontFamily: UI_FONT,
  },
  drawerHeader: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerTitle: {
    color: '#F3F8FF',
    fontSize: 28,
    fontFamily: HEADER_FONT,
  },
  drawerSubtitle: {
    color: '#98B4D1',
    fontSize: 12,
    marginTop: 4,
    fontFamily: UI_FONT,
  },
  captureBadge: {
    minWidth: 74,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
  },
  captureBadgeReady: {
    backgroundColor: '#A61C28',
    borderWidth: 1,
    borderColor: '#D74B5B',
  },
  captureBadgeIdle: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.16)',
  },
  captureBadgeText: {
    color: '#FFF1D8',
    fontSize: 14,
    fontWeight: '900',
    fontFamily: STAT_FONT,
  },
  progressTrack: {
    marginTop: 16,
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#67E6FF',
  },
  drawerMetrics: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  drawerMetric: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.12)',
  },
  drawerMetricValue: {
    color: '#F3F8FF',
    fontSize: 16,
    fontFamily: STAT_FONT,
    marginTop: 4,
  },
  drawerMetricLabel: {
    color: '#8EB5D8',
    fontSize: 11,
    marginTop: 3,
    fontFamily: UI_FONT,
  },
  rulesCard: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(245, 193, 93, 0.14)',
    padding: 14,
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rulesTitle: {
    color: '#F4F8FF',
    fontSize: 14,
    fontFamily: TITLE_FONT,
  },
  rulesText: {
    color: '#9AB5D1',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    fontFamily: UI_FONT,
  },
  claimButton: {
    marginTop: 16,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#A61C28',
    borderWidth: 1,
    borderColor: '#D74B5B',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  claimButtonText: {
    color: '#FFF1D8',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    fontFamily: UI_FONT,
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
    backgroundColor: '#A61C28',
    borderWidth: 1,
    borderColor: '#D74B5B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#67E6FF',
    borderWidth: 1,
    borderColor: '#C1F6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#162944',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ActiveRunScreen;
