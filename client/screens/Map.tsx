import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  InteractionManager,
  Modal,
  PanResponder,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MapView, {
  Circle,
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import TacticalHud from '../components/map/TacticalHud';
import TerritoryIntelSheet from '../components/map/TerritoryIntelSheet';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  claimTerritory as apiClaimTerritory,
  fetchTerritories,
} from '../services/api';
import { ActiveRun, Run, Territory } from '../types/game';
import {
  calculateCalories,
  calculatePace,
  calculatePathDistance,
  calculateSpeed,
  LocationPoint,
} from '../utils/gpsTracking';
import { getMockTerritories } from '../utils/mockTerritories';
import { saveRun, saveTerritory, updateUserStats } from '../utils/storage';
import {
  calculatePolygonArea,
  getPolygonCenter,
  isNearStartPoint,
  isValidTerritory,
  simplifyPolygon,
} from '../utils/territoryUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 270;
const HALF_HEIGHT = SCREEN_HEIGHT * 0.52;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.83;
const DEFAULT_MUMBAI_REGION = {
  latitude: 19.076,
  longitude: 72.8777,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};
const FALLBACK_USER_ID = 'user-1';
const FALLBACK_USER_NAME = 'Aarav';
const DECAY_WINDOW_HOURS = 7 * 24;
const HEADER_FONT = Platform.select({
  ios: 'AvenirNextCondensed-Heavy',
  android: 'sans-serif-condensed',
  default: undefined,
});
const TACTICAL_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#08111A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#ADC2D4' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#050A10' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#112331' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#09131D' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#0B1823' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#183040' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#224054' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#050E16' }],
  },
];

type CaptureCelebration = {
  title: string;
  subtitle: string;
};

type TerritoryStatus = 'owned' | 'enemy' | 'contested';

type TerritoryDisplay = {
  territory: Territory;
  center: LocationPoint;
  name: string;
  status: TerritoryStatus;
  daysHeld: number;
  decayHoursRemaining: number;
};

const TERRITORY_NAME_PREFIXES = [
  'Bandra',
  'Dadar',
  'Worli',
  'Colaba',
  'Powai',
  'Andheri',
  'Mahim',
  'Versova',
];
const TERRITORY_NAME_SUFFIXES = [
  'Seaface',
  'Maidan',
  'Naka',
  'Marg',
  'Khadi',
  'Depot',
  'Chowk',
  'Point',
];

function hashString(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 2147483647;
  }

  return Math.abs(hash);
}

function getPlayerRankTitle(ownedTerritories: number, totalDistanceKm: number) {
  if (ownedTerritories >= 40 || totalDistanceKm >= 200) {
    return 'Overlord';
  }

  if (ownedTerritories >= 18 || totalDistanceKm >= 90) {
    return 'Warlord';
  }

  if (ownedTerritories >= 8 || totalDistanceKm >= 30) {
    return 'Captain';
  }

  return 'Scout';
}

function getTerritoryName(territory: Territory) {
  const hash = hashString(territory.id);
  const prefix = TERRITORY_NAME_PREFIXES[hash % TERRITORY_NAME_PREFIXES.length];
  const suffix =
    TERRITORY_NAME_SUFFIXES[
      Math.floor(hash / 7) % TERRITORY_NAME_SUFFIXES.length
    ];
  return `${prefix} ${suffix}`;
}

function getTerritoryStatus(
  territory: Territory,
  currentUserId: string,
): TerritoryStatus {
  if (territory.isUnderChallenge) {
    return 'contested';
  }

  return territory.ownerId === currentUserId ? 'owned' : 'enemy';
}

function getTerritoryPalette(
  status: TerritoryStatus,
  isSelected: boolean,
  isOwnedByCurrentUser: boolean,
) {
  const selectedStroke = isSelected ? '#FFF1AE' : undefined;

  if (status === 'owned') {
    return {
      fill: isOwnedByCurrentUser
        ? 'rgba(41, 240, 215, 0.34)'
        : 'rgba(41, 240, 215, 0.2)',
      stroke: selectedStroke || '#2AF0D8',
      strokeWidth: isOwnedByCurrentUser ? 4.5 : 3.2,
      marker: '#29F0D7',
      markerBg: '#0E3B36',
    };
  }

  if (status === 'contested') {
    return {
      fill: 'rgba(255, 211, 77, 0.24)',
      stroke: selectedStroke || '#FFD34D',
      strokeWidth: 3.4,
      marker: '#FFD34D',
      markerBg: '#52410A',
    };
  }

  return {
    fill: 'rgba(255, 122, 69, 0.18)',
    stroke: selectedStroke || '#FF7A45',
    strokeWidth: 2.5,
    marker: '#FF7A45',
    markerBg: '#4B2417',
  };
}

function isPointInsideRegion(point: LocationPoint, region: Region) {
  const latitudeMin = region.latitude - region.latitudeDelta;
  const latitudeMax = region.latitude + region.latitudeDelta;
  const longitudeMin = region.longitude - region.longitudeDelta;
  const longitudeMax = region.longitude + region.longitudeDelta;

  return (
    point.latitude >= latitudeMin &&
    point.latitude <= latitudeMax &&
    point.longitude >= longitudeMin &&
    point.longitude <= longitudeMax
  );
}

const RunMap = ({ navigation }: { navigation: any }) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const currentUserId = user?.id ?? FALLBACK_USER_ID;
  const currentUserName =
    user?.user_metadata?.username ??
    user?.email?.split('@')[0] ??
    FALLBACK_USER_NAME;

  const [activeRun, setActiveRun] = useState<ActiveRun>({
    state: 'idle',
    startTime: null,
    path: [],
    distance: 0,
    duration: 0,
    pausedDuration: 0,
    isNearStart: false,
  });
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [userLocation, setUserLocation] = useState<LocationPoint | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [timer, setTimer] = useState(0);
  const [mapRegion, setMapRegion] = useState<Region>({
    ...DEFAULT_MUMBAI_REGION,
  });
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>(
    'standard',
  );
  const [showMapTypeOverlay, setShowMapTypeOverlay] = useState(false);
  const [useMockTerritories, setUseMockTerritories] = useState(__DEV__);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(
    null,
  );
  const [captureCelebration, setCaptureCelebration] =
    useState<CaptureCelebration | null>(null);
  const [overlays, setOverlays] = useState({
    territories: true,
    heatmap: false,
    pulse: true,
    routes: false,
  });
  const [heatmapPoints, setHeatmapPoints] = useState<
    Array<{ lat: number; lng: number; intensity: number }>
  >([]);

  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);
  const hasCenteredOnUser = useRef(false);
  const mockSeedKeyRef = useRef('');
  const mapRef = useRef<MapView>(null);
  const sheetHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const lastSheetHeight = useRef(COLLAPSED_HEIGHT);
  const isAnimating = useRef(false);
  const conquestPulse = useRef(new Animated.Value(0)).current;
  const captureOpacity = useRef(new Animated.Value(0)).current;
  const captureTranslateY = useRef(new Animated.Value(12)).current;

  const territoryDisplays: TerritoryDisplay[] = territories.map(territory => {
    const center = getPolygonCenter(territory.boundary);
    const status = getTerritoryStatus(territory, currentUserId);
    const claimedAt = new Date(territory.claimedAt).getTime();
    const heldHours = Math.max(0, (Date.now() - claimedAt) / 3_600_000);

    return {
      territory,
      center,
      name: getTerritoryName(territory),
      status,
      daysHeld: Math.floor(heldHours / 24),
      decayHoursRemaining: Math.max(0, DECAY_WINDOW_HOURS - Math.floor(heldHours)),
    };
  });
  const visibleTerritories = territoryDisplays.filter(display =>
    isPointInsideRegion(display.center, mapRegion),
  );
  const selectedTerritory =
    territoryDisplays.find(display => display.territory.id === selectedTerritoryId) ??
    null;
  const ownedTerritories = territories.filter(
    territory => territory.ownerId === currentUserId,
  ).length;
  const visibleEnemyCount = visibleTerritories.filter(
    territory => territory.status === 'enemy',
  ).length;
  const contestedCount = visibleTerritories.filter(
    territory => territory.status === 'contested',
  ).length;
  const rankTitle = getPlayerRankTitle(ownedTerritories, activeRun.distance);
  const sortedTerritories = [...territoryDisplays].sort((left, right) => {
    const leftOwned = left.territory.ownerId === currentUserId ? 1 : 0;
    const rightOwned = right.territory.ownerId === currentUserId ? 1 : 0;

    if (leftOwned !== rightOwned) {
      return leftOwned - rightOwned;
    }

    if (left.territory.id === selectedTerritoryId) {
      return 1;
    }

    if (right.territory.id === selectedTerritoryId) {
      return -1;
    }

    return left.daysHeld - right.daysHeld;
  });

  const snapToPosition = (position: number) => {
    if (isAnimating.current) {
      return;
    }

    isAnimating.current = true;
    lastSheetHeight.current = position;

    Animated.spring(sheetHeight, {
      toValue: position,
      useNativeDriver: false,
      tension: 48,
      friction: 9,
    }).start(() => {
      isAnimating.current = false;
    });
  };

  const getNextSnapPoint = (gestureDirection: number) => {
    const snapPoints = [COLLAPSED_HEIGHT, HALF_HEIGHT, EXPANDED_HEIGHT];

    if (gestureDirection < -10) {
      return snapPoints.find(point => point > lastSheetHeight.current) ?? EXPANDED_HEIGHT;
    }

    if (gestureDirection > 10) {
      return (
        [...snapPoints].reverse().find(point => point < lastSheetHeight.current) ??
        COLLAPSED_HEIGHT
      );
    }

    return lastSheetHeight.current;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSafePace = () => {
    try {
      return activeRun.distance > 0.005
        ? calculatePace(activeRun.distance, timer)
        : '0\'00"';
    } catch {
      return '0\'00"';
    }
  };

  const getSafeSpeed = () => {
    try {
      return activeRun.distance > 0.005
        ? calculateSpeed(activeRun.distance, timer).toFixed(1)
        : '0.0';
    } catch {
      return '0.0';
    }
  };

  const getSafeCalories = () => {
    try {
      return calculateCalories(activeRun.distance);
    } catch {
      return 0;
    }
  };

  const showCaptureToast = (title: string, subtitle: string) => {
    setCaptureCelebration({ title, subtitle });
    captureOpacity.setValue(0);
    captureTranslateY.setValue(18);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(captureOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(captureTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 8,
        }),
      ]),
      Animated.delay(1700),
      Animated.parallel([
        Animated.timing(captureOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(captureTranslateY, {
          toValue: -12,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      if (isMounted.current) {
        setCaptureCelebration(null);
      }
    });
  };

  const generateHeatmapPoints = (
    centerLat: number,
    centerLng: number,
    count: number = 80,
  ) => {
    const points = [];
    const radius = 0.02;

    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radius;
      points.push({
        lat: centerLat + distance * Math.cos(angle),
        lng: centerLng + distance * Math.sin(angle),
        intensity: Math.random(),
      });
    }

    return points;
  };

  const requestForegroundLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message:
          'RunBound needs access to your location to track your runs and claim territory.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isAnimating.current) {
          return false;
        }

        return (
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          Math.abs(gestureState.dy) > 5
        );
      },
      onPanResponderGrant: () => {
        sheetHeight.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const nextHeight = lastSheetHeight.current - gestureState.dy;

        if (nextHeight >= COLLAPSED_HEIGHT && nextHeight <= EXPANDED_HEIGHT) {
          sheetHeight.setValue(nextHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        snapToPosition(getNextSnapPoint(gestureState.dy));
      },
    }),
  ).current;

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(conquestPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(conquestPulse, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [conquestPulse]);

  useEffect(() => {
    const loadData = async () => {
      if (useMockTerritories) {
        const centerLat = userLocation?.latitude ?? mapRegion.latitude;
        const centerLng = userLocation?.longitude ?? mapRegion.longitude;

        if (isMounted.current) {
          setTerritories(getMockTerritories(centerLat, centerLng));
        }
        return;
      }

      try {
        const loaded = await fetchTerritories();

        if (!isMounted.current) {
          return;
        }

        if (Array.isArray(loaded) && loaded.length > 0) {
          setTerritories(loaded as Territory[]);
        } else {
          setTerritories(getMockTerritories(mapRegion.latitude, mapRegion.longitude));
        }
      } catch {
        if (isMounted.current) {
          setTerritories(getMockTerritories(mapRegion.latitude, mapRegion.longitude));
        }
      }
    };

    loadData();
  }, [
    mapRegion.latitude,
    mapRegion.longitude,
    useMockTerritories,
    userLocation?.latitude,
    userLocation?.longitude,
  ]);

  useEffect(() => {
    if (!useMockTerritories || !userLocation || !isMounted.current) {
      return;
    }

    const seedKey = `${userLocation.latitude.toFixed(3)},${userLocation.longitude.toFixed(3)}`;
    if (mockSeedKeyRef.current === seedKey) {
      return;
    }

    mockSeedKeyRef.current = seedKey;
    setTerritories(getMockTerritories(userLocation.latitude, userLocation.longitude));
  }, [useMockTerritories, userLocation]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const onTerritoryNew = (territory: Territory) => {
      if (!isMounted.current) {
        return;
      }

      setTerritories(previous =>
        previous.some(existing => existing.id === territory.id)
          ? previous
          : [...previous, territory],
      );
    };

    socket.on('territory:new', onTerritoryNew);
    return () => {
      socket.off('territory:new', onTerritoryNew);
    };
  }, [socket]);

  useEffect(() => {
    const interaction = InteractionManager.runAfterInteractions(async () => {
      if (!isMounted.current) {
        return;
      }

      try {
        const granted = await requestForegroundLocationPermission();
        if (isMounted.current) {
          setHasLocationPermission(granted);
        }

        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Location permission required to track runs.',
          );
        }
      } catch (error) {
        console.error('Permission error:', error);
      }
    });

    return () => interaction.cancel();
  }, []);

  useEffect(() => {
    if (activeRun.state === 'running') {
      timerInterval.current = setInterval(() => {
        if (isMounted.current) {
          setTimer(previous => previous + 1);
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
    };
  }, [activeRun.state]);

  useEffect(() => {
    if (overlays.heatmap && userLocation) {
      setHeatmapPoints(
        generateHeatmapPoints(userLocation.latitude, userLocation.longitude),
      );
    } else {
      setHeatmapPoints([]);
    }
  }, [overlays.heatmap, userLocation]);

  useEffect(() => {
    if (
      selectedTerritoryId &&
      !territoryDisplays.some(
        display => display.territory.id === selectedTerritoryId,
      )
    ) {
      setSelectedTerritoryId(null);
    }
  }, [selectedTerritoryId, territoryDisplays]);

  const handleCenterOnUser = () => {
    if (!userLocation || !mapRef.current) {
      return;
    }

    mapRef.current.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500,
    );
  };

  const handleTerritoryPress = (territoryId: string) => {
    setSelectedTerritoryId(territoryId);
    snapToPosition(HALF_HEIGHT);
  };

  const handleViewOwnerProfile = () => {
    if (!selectedTerritory?.territory.ownerName) {
      return;
    }

    navigation.navigate('Profile');
  };

  const handleChallengeTerritory = () => {
    if (!selectedTerritory) {
      return;
    }

    if (selectedTerritory.status === 'owned') {
      Alert.alert(
        'Territory Fortified',
        'This blob is already under your control.',
      );
      return;
    }

    setTerritories(previous =>
      previous.map(territory =>
        territory.id === selectedTerritory.territory.id
          ? { ...territory, isUnderChallenge: true }
          : territory,
      ),
    );

    Alert.alert(
      'Challenge Started',
      `${selectedTerritory.name} is now contested. Complete a clean loop to overtake it.`,
    );
  };

  const handleSelectMapType = (type: 'standard' | 'satellite' | 'hybrid') => {
    setMapType(type);
    setShowMapTypeOverlay(false);
  };

  const handleToggleOverlay = (overlayKey: keyof typeof overlays) => {
    setOverlays(previous => ({ ...previous, [overlayKey]: !previous[overlayKey] }));
  };

  const handleStartRun = async () => {
    try {
      const permissionGranted =
        hasLocationPermission || (await requestForegroundLocationPermission());

      if (!permissionGranted) {
        if (isMounted.current) {
          setHasLocationPermission(false);
        }
        Alert.alert(
          'Permission Required',
          'Location permission required to track runs.',
        );
        return;
      }

      if (isMounted.current) {
        setHasLocationPermission(true);
      }

      if (!userLocation) {
        Alert.alert(
          'Locating You',
          'Waiting for GPS signal. Keep the map open briefly and try again.',
        );
        return;
      }

      const newRun = {
        state: 'running' as const,
        startTime: new Date(),
        path: [userLocation],
        distance: 0,
        duration: 0,
        pausedDuration: 0,
        isNearStart: false,
      };

      if (isMounted.current) {
        setActiveRun(newRun);
        setTimer(0);
      }

      navigation.navigate('ActiveRun', {
        initialActiveRun: newRun,
        targetTerritory: selectedTerritory?.territory ?? null,
        onPause: () => setActiveRun(previous => ({ ...previous, state: 'paused' })),
        onResume: () => setActiveRun(previous => ({ ...previous, state: 'running' })),
        onStop: () => {
          setActiveRun({
            state: 'idle',
            startTime: null,
            path: [],
            distance: 0,
            duration: 0,
            pausedDuration: 0,
            isNearStart: false,
          });
          setTimer(0);
        },
        onClaim: handleClaimTerritory,
        onRunUpdate: (updatedRun: ActiveRun) => {
          setActiveRun(updatedRun);
        },
      });
    } catch (error) {
      console.error('Error starting run:', error);
    }
  };

  const handleClaimTerritory = async () => {
    try {
      if (activeRun.path.length < 10) {
        Alert.alert(
          'Loop Too Short',
          'Run a larger loop to carve a territory blob.',
        );
        return;
      }

      const polygon = [...activeRun.path];
      const closedPolygon =
        polygon.length > 0 ? [...polygon, polygon[0]] : polygon;

      const validation = isValidTerritory(closedPolygon);
      if (!validation.valid) {
        Alert.alert(
          'Cannot Claim Territory',
          validation.reason || 'Invalid territory.',
        );
        return;
      }

      const pace = getSafePace();
      const speed = getSafeSpeed();
      const calories = getSafeCalories();
      const runId = `run-${Date.now()}`;
      const claimedAt = new Date();
      const simplifiedBoundary = simplifyPolygon(polygon);
      const finalBoundary =
        simplifiedBoundary.length >= 3 ? simplifiedBoundary : polygon;
      const claimedArea = validation.area ?? calculatePolygonArea(finalBoundary);
      const newTerritory: Territory = {
        id: `territory-${runId}`,
        ownerId: currentUserId,
        ownerName: currentUserName,
        ownerColor: '#29F0D7',
        boundary: finalBoundary,
        area: claimedArea,
        claimedAt,
        lastDefended: null,
        strength: 100,
        isUnderChallenge: false,
        runId,
      };

      const completedRun: Run = {
        id: runId,
        userId: currentUserId,
        startTime: activeRun.startTime || new Date(),
        endTime: new Date(),
        path: activeRun.path,
        distance: activeRun.distance,
        duration: timer,
        averagePace: pace,
        averageSpeed: parseFloat(speed),
        isLoop: true,
        territoryClaimed: newTerritory.id,
        territoriesChallenged: [],
        calories,
      };

      const saveTasks: Array<Promise<unknown>> = [
        saveRun(completedRun),
        updateUserStats(activeRun.distance, claimedArea),
        saveTerritory(newTerritory),
        apiClaimTerritory({
          territory: newTerritory,
          run: {
            id: completedRun.id,
            distance: completedRun.distance,
            duration: completedRun.duration,
            averagePace: completedRun.averagePace,
            averageSpeed: completedRun.averageSpeed,
            calories: completedRun.calories,
            path: activeRun.path,
          },
        }).catch(error =>
          console.warn('[api] territory claim failed:', error.message),
        ),
      ];

      await Promise.all(saveTasks);

      if (isMounted.current) {
        setTerritories(previous => [...previous, newTerritory]);
      }

      const xpEarned = Math.round(activeRun.distance * 90) + 180;
      showCaptureToast(
        `+${xpEarned} XP`,
        `${getTerritoryName(newTerritory)} captured`,
      );
      setSelectedTerritoryId(newTerritory.id);
      setActiveRun({
        state: 'idle',
        startTime: null,
        path: [],
        distance: 0,
        duration: 0,
        pausedDuration: 0,
        isNearStart: false,
      });
      setTimer(0);
    } catch (error) {
      console.error('Error claiming territory:', error);
      Alert.alert('Error', 'Failed to claim territory. Please try again.');
    }
  };

  const pace = getSafePace();
  const speed = getSafeSpeed();
  const calories = getSafeCalories();
  const pulseScale = conquestPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.18],
  });
  const pulseOpacity = conquestPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0.16],
  });
  const simplifiedPreview = simplifyPolygon(activeRun.path);
  const previewBoundary =
    simplifiedPreview.length > 2 ? simplifiedPreview : activeRun.path;

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          mapType={mapType}
          customMapStyle={mapType === 'standard' ? TACTICAL_MAP_STYLE : undefined}
          initialRegion={mapRegion}
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={false}
          followsUserLocation={activeRun.state === 'running'}
          onRegionChangeComplete={setMapRegion}
          onUserLocationChange={event => {
            const { coordinate } = event.nativeEvent;

            if (
              !coordinate ||
              typeof coordinate.latitude !== 'number' ||
              typeof coordinate.longitude !== 'number'
            ) {
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

            if (!isMounted.current) {
              return;
            }

            setUserLocation(location);

            if (!hasCenteredOnUser.current) {
              hasCenteredOnUser.current = true;
              const nextRegion = {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              };
              setMapRegion(nextRegion);
              mapRef.current?.animateToRegion(nextRegion, 450);
            }

            if (activeRun.state === 'running') {
              setActiveRun(previous => {
                const nextPath = [...previous.path, location];
                const nextDistance = calculatePathDistance(nextPath);
                const isNearLoop =
                  previous.path.length > 10 &&
                  isNearStartPoint(location, previous.path[0]);

                return {
                  ...previous,
                  path: nextPath,
                  distance: nextDistance,
                  isNearStart: isNearLoop,
                };
              });
            }
          }}
        >
          {overlays.territories &&
            sortedTerritories.map(display => {
              const isSelected =
                selectedTerritory?.territory.id === display.territory.id;
              const isOwnedByCurrentUser =
                display.territory.ownerId === currentUserId;
              const palette = getTerritoryPalette(
                display.status,
                isSelected,
                isOwnedByCurrentUser,
              );
              const validBoundary = display.territory.boundary.filter(
                point =>
                  typeof point.latitude === 'number' &&
                  typeof point.longitude === 'number',
              );

              if (validBoundary.length < 3) {
                return null;
              }

              return (
                <Polygon
                  key={display.territory.id}
                  coordinates={validBoundary}
                  fillColor={palette.fill}
                  strokeColor={palette.stroke}
                  strokeWidth={palette.strokeWidth}
                  tappable
                  onPress={() => handleTerritoryPress(display.territory.id)}
                />
              );
            })}

          {overlays.territories &&
            sortedTerritories.map(display => {
              const isSelected =
                selectedTerritory?.territory.id === display.territory.id;
              const isOwnedByCurrentUser =
                display.territory.ownerId === currentUserId;
              const palette = getTerritoryPalette(
                display.status,
                isSelected,
                isOwnedByCurrentUser,
              );
              const shouldPulse =
                overlays.pulse &&
                (display.status === 'contested' || isOwnedByCurrentUser || isSelected);

              return (
                <Marker
                  key={`${display.territory.id}-marker`}
                  coordinate={{
                    latitude: display.center.latitude,
                    longitude: display.center.longitude,
                  }}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={styles.markerWrapper}>
                    {shouldPulse && (
                      <Animated.View
                        style={[
                          styles.markerPulse,
                          {
                            borderColor: palette.marker,
                            opacity: pulseOpacity,
                            transform: [{ scale: pulseScale }],
                          },
                        ]}
                      />
                    )}
                    <View
                      style={[
                        styles.markerBadge,
                        isOwnedByCurrentUser && styles.markerBadgeOwned,
                        {
                          backgroundColor: palette.markerBg,
                          borderColor: palette.marker,
                        },
                      ]}
                    >
                      <Icon
                        name={
                          display.status === 'owned'
                            ? 'shield-outline'
                            : display.status === 'contested'
                              ? 'flame-outline'
                              : 'warning-outline'
                        }
                        size={isOwnedByCurrentUser ? 16 : 14}
                        color={palette.marker}
                      />
                    </View>
                  </View>
                </Marker>
              );
            })}

          {selectedTerritory && (
            <Circle
              center={{
                latitude: selectedTerritory.center.latitude,
                longitude: selectedTerritory.center.longitude,
              }}
              radius={140}
              fillColor="rgba(255, 211, 77, 0.08)"
              strokeColor="rgba(255, 211, 77, 0.42)"
            />
          )}

          {activeRun.state !== 'idle' && previewBoundary.length > 2 && (
            <Polygon
              coordinates={previewBoundary}
              fillColor={
                activeRun.isNearStart
                  ? 'rgba(41, 240, 215, 0.18)'
                  : 'rgba(41, 240, 215, 0.1)'
              }
              strokeColor={activeRun.isNearStart ? '#FFD34D' : '#29F0D7'}
              strokeWidth={activeRun.isNearStart ? 3 : 2}
            />
          )}

          {activeRun.state !== 'idle' && activeRun.path.length > 1 && (
            <Polyline
              coordinates={activeRun.path}
              strokeColor={activeRun.isNearStart ? '#FFD34D' : '#29F0D7'}
              strokeWidth={activeRun.isNearStart ? 7 : 5}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {overlays.heatmap &&
            heatmapPoints.map((point, index) => (
              <Circle
                key={`heatmap-${index}`}
                center={{ latitude: point.lat, longitude: point.lng }}
                radius={30 + point.intensity * 40}
                fillColor={`rgba(41, 240, 215, ${0.12 + point.intensity * 0.18})`}
                strokeColor="transparent"
              />
            ))}

          {overlays.routes &&
            heatmapPoints.map((point, index) => (
              <Circle
                key={`route-${index}`}
                center={{ latitude: point.lat, longitude: point.lng }}
                radius={18 + point.intensity * 28}
                fillColor={`rgba(255, 122, 69, ${0.12 + point.intensity * 0.16})`}
                strokeColor="transparent"
              />
            ))}
        </MapView>

        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(4, 8, 14, 0.78)',
            'rgba(7, 18, 26, 0.18)',
            'rgba(4, 8, 14, 0.9)',
          ]}
          locations={[0, 0.42, 1]}
          style={styles.mapAtmosphere}
        />

        <View pointerEvents="none" style={styles.gridScrim}>
          <View style={styles.scanline} />
          <View style={[styles.scanline, styles.scanlineMid]} />
          <View style={[styles.scanline, styles.scanlineBottom]} />
        </View>

        <TacticalHud
          playerName={currentUserName}
          territoryCount={ownedTerritories}
          visibleEnemyCount={visibleEnemyCount}
          contestedCount={contestedCount}
          rankTitle={rankTitle}
          gpsReady={!!userLocation}
        />

        <View style={styles.overlayChipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.overlayChipsContent}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                overlays.territories && styles.filterChipActiveTeal,
              ]}
              onPress={() => handleToggleOverlay('territories')}
            >
              <Icon
                name="shapes-outline"
                size={14}
                color={overlays.territories ? '#051217' : '#F1F5FA'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  overlays.territories && styles.filterChipTextDark,
                ]}
              >
                Blobs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                overlays.heatmap && styles.filterChipActiveGold,
              ]}
              onPress={() => handleToggleOverlay('heatmap')}
            >
              <Icon
                name="analytics-outline"
                size={14}
                color={overlays.heatmap ? '#1D1403' : '#F1F5FA'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  overlays.heatmap && styles.filterChipTextDarkWarm,
                ]}
              >
                Intel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                overlays.pulse && styles.filterChipActiveOrange,
              ]}
              onPress={() => handleToggleOverlay('pulse')}
            >
              <Icon
                name="pulse-outline"
                size={14}
                color={overlays.pulse ? '#200A02' : '#F1F5FA'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  overlays.pulse && styles.filterChipTextDarkWarm,
                ]}
              >
                Pulse
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                overlays.routes && styles.filterChipActiveOrange,
              ]}
              onPress={() => handleToggleOverlay('routes')}
            >
              <Icon
                name="git-network-outline"
                size={14}
                color={overlays.routes ? '#200A02' : '#F1F5FA'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  overlays.routes && styles.filterChipTextDarkWarm,
                ]}
              >
                Routes
              </Text>
            </TouchableOpacity>

            {__DEV__ && (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  useMockTerritories && styles.filterChipActiveTeal,
                ]}
                onPress={() => setUseMockTerritories(previous => !previous)}
              >
                <Icon
                  name="flask-outline"
                  size={14}
                  color={useMockTerritories ? '#051217' : '#F1F5FA'}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    useMockTerritories && styles.filterChipTextDark,
                  ]}
                >
                  Mock
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.legendOwned]} />
            <Text style={styles.legendText}>Your Blob</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.legendEnemy]} />
            <Text style={styles.legendText}>Enemy Blob</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.legendContested]} />
            <Text style={styles.legendText}>Contested</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.legendRoute]} />
            <Text style={styles.legendText}>Live Loop</Text>
          </View>
        </View>

        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleCenterOnUser}
          >
            <Icon name="locate" size={22} color="#E8F7FF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowMapTypeOverlay(true)}
          >
            <Icon name="layers-outline" size={22} color="#E8F7FF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.startFab} onPress={handleStartRun}>
          <LinearGradient
            colors={['#FFD34D', '#FFAA2B']}
            style={styles.startFabGradient}
          >
            <Icon name="footsteps-outline" size={24} color="#121417" />
            <Text style={styles.startFabText}>START RUN</Text>
          </LinearGradient>
        </TouchableOpacity>

        {activeRun.isNearStart && (
          <TouchableOpacity
            style={styles.loopReadyBanner}
            onPress={handleClaimTerritory}
          >
            <Icon name="trophy" size={18} color="#121417" />
            <Text style={styles.loopReadyText}>Close the loop to conquer</Text>
          </TouchableOpacity>
        )}

        {captureCelebration && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.captureCelebration,
              {
                opacity: captureOpacity,
                transform: [{ translateY: captureTranslateY }],
              },
            ]}
          >
            <Icon name="sparkles" size={18} color="#FFD34D" />
            <View style={styles.captureTextWrap}>
              <Text style={styles.captureTitle}>{captureCelebration.title}</Text>
              <Text style={styles.captureSubtitle}>
                {captureCelebration.subtitle}
              </Text>
            </View>
          </Animated.View>
        )}
      </View>

      <Modal
        visible={showMapTypeOverlay}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMapTypeOverlay(false)}
      >
        <TouchableOpacity
          style={styles.overlayBackdrop}
          activeOpacity={1}
          onPress={() => setShowMapTypeOverlay(false)}
        >
          <View style={styles.mapTypeOverlay}>
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>Map Layers</Text>
              <TouchableOpacity onPress={() => setShowMapTypeOverlay(false)}>
                <Icon name="close" size={24} color="#FFF3C4" />
              </TouchableOpacity>
            </View>

            <View style={styles.overlaySection}>
              {(['standard', 'satellite', 'hybrid'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.mapTypeOption,
                    mapType === type && styles.mapTypeOptionActive,
                  ]}
                  onPress={() => handleSelectMapType(type)}
                >
                  <Icon
                    name={
                      type === 'standard'
                        ? 'map-outline'
                        : type === 'satellite'
                          ? 'globe-outline'
                          : 'layers-outline'
                    }
                    size={22}
                    color={mapType === type ? '#FFD34D' : '#E3E9F5'}
                  />
                  <Text
                    style={[
                      styles.mapTypeText,
                      mapType === type && styles.mapTypeTextActive,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                  {mapType === type && (
                    <Icon name="checkmark-circle" size={20} color="#FFD34D" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Animated.View
        style={[styles.bottomSheet, { height: sheetHeight }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
          <Text style={styles.bottomSheetEyebrow}>Frontline Command</Text>
        </View>

        <ScrollView
          style={styles.sheetScroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <TerritoryIntelSheet
            selectedTerritory={
              selectedTerritory
                ? {
                    id: selectedTerritory.territory.id,
                    name: selectedTerritory.name,
                    ownerName: selectedTerritory.territory.ownerName,
                    status: selectedTerritory.status,
                    daysHeld: selectedTerritory.daysHeld,
                    decayHoursRemaining: selectedTerritory.decayHoursRemaining,
                    areaM2: selectedTerritory.territory.area * 1_000_000,
                    strength: selectedTerritory.territory.strength,
                  }
                : null
            }
            territoryCount={ownedTerritories}
            enemyCount={visibleEnemyCount}
            contestedCount={contestedCount}
            distanceKm={activeRun.distance}
            durationLabel={formatTime(timer)}
            averageSpeed={speed}
            onStartRun={handleStartRun}
            onChallengeTerritory={handleChallengeTerritory}
            onViewOwner={handleViewOwnerProfile}
          />

          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatCard}>
              <Icon name="flame-outline" size={18} color="#FF7A45" />
              <Text style={styles.quickStatValue}>{calories}</Text>
              <Text style={styles.quickStatLabel}>KCAL</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Icon name="timer-outline" size={18} color="#FFD34D" />
              <Text style={styles.quickStatValue}>{pace}</Text>
              <Text style={styles.quickStatLabel}>PACE</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Icon name="shield-outline" size={18} color="#29F0D7" />
              <Text style={styles.quickStatValue}>{ownedTerritories}</Text>
              <Text style={styles.quickStatLabel}>HELD</Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03080E',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapAtmosphere: {
    ...StyleSheet.absoluteFillObject,
  },
  gridScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '24%',
    height: 1,
    backgroundColor: 'rgba(41, 240, 215, 0.12)',
  },
  scanlineMid: {
    top: '54%',
    backgroundColor: 'rgba(255, 211, 77, 0.1)',
  },
  scanlineBottom: {
    top: '82%',
    backgroundColor: 'rgba(255, 122, 69, 0.12)',
  },
  overlayChipsContainer: {
    position: 'absolute',
    top: 244,
    left: 0,
    right: 86,
    paddingLeft: 16,
  },
  overlayChipsContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(9, 15, 24, 0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActiveTeal: {
    backgroundColor: '#29F0D7',
    borderColor: '#9FFFF3',
  },
  filterChipActiveGold: {
    backgroundColor: '#FFD34D',
    borderColor: '#FFEEA8',
  },
  filterChipActiveOrange: {
    backgroundColor: '#FF7A45',
    borderColor: '#FFC2AA',
  },
  filterChipText: {
    color: '#F1F5FA',
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextDark: {
    color: '#051217',
  },
  filterChipTextDarkWarm: {
    color: '#1E1104',
  },
  legend: {
    position: 'absolute',
    left: 16,
    bottom: 308,
    backgroundColor: 'rgba(8, 13, 20, 0.88)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginVertical: 4,
  },
  legendOwned: {
    backgroundColor: '#29F0D7',
  },
  legendEnemy: {
    backgroundColor: '#FF7A45',
  },
  legendContested: {
    backgroundColor: '#FFD34D',
  },
  legendRoute: {
    backgroundColor: '#29F0D7',
    opacity: 0.7,
  },
  legendText: {
    color: '#D7DFED',
    fontSize: 11,
    fontWeight: '700',
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 248,
    gap: 10,
  },
  controlButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(10, 16, 25, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  startFab: {
    position: 'absolute',
    right: 16,
    bottom: 304,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#FFB72E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  startFabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFE89A',
  },
  startFabText: {
    color: '#121417',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  loopReadyBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 404,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFD34D',
    borderRadius: 18,
    paddingVertical: 13,
    borderWidth: 2,
    borderColor: '#FFF0AE',
  },
  loopReadyText: {
    color: '#121417',
    fontSize: 14,
    fontWeight: '900',
  },
  markerWrapper: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
  },
  markerBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerBadgeOwned: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  captureCelebration: {
    position: 'absolute',
    top: 198,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(8, 15, 25, 0.95)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 211, 77, 0.25)',
  },
  captureTextWrap: {
    alignItems: 'flex-start',
  },
  captureTitle: {
    color: '#FFF4C7',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
  },
  captureSubtitle: {
    color: '#C5D1E0',
    fontSize: 12,
    marginTop: 2,
  },
  overlayBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2, 4, 8, 0.72)',
  },
  mapTypeOverlay: {
    backgroundColor: '#0D1721',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 38,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  overlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  overlayTitle: {
    color: '#FFF5CF',
    fontSize: 24,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
  },
  overlaySection: {
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 10,
  },
  mapTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mapTypeOptionActive: {
    backgroundColor: 'rgba(255, 211, 77, 0.09)',
    borderColor: 'rgba(255, 211, 77, 0.25)',
  },
  mapTypeText: {
    flex: 1,
    color: '#E7EEF8',
    fontSize: 16,
    fontWeight: '700',
  },
  mapTypeTextActive: {
    color: '#FFF1B2',
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 11, 18, 0.98)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 10,
  },
  dragHandle: {
    width: 58,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 211, 77, 0.5)',
  },
  bottomSheetEyebrow: {
    marginTop: 10,
    color: '#FFD34D',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sheetScroll: {
    flex: 1,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 42,
  },
  quickStatCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quickStatValue: {
    color: '#F6F8FD',
    fontSize: 17,
    fontWeight: '900',
    fontFamily: HEADER_FONT,
    marginTop: 4,
  },
  quickStatLabel: {
    color: '#98A6C0',
    fontSize: 11,
    marginTop: 2,
  },
});

export default RunMap;
