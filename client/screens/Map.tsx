import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
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
import { STAT_FONT, TITLE_FONT, UI_FONT } from '../theme/fonts';
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
  isPointInPolygon,
  isNearStartPoint,
  isValidTerritory,
  simplifyPolygon,
} from '../utils/territoryUtils';

const {
  createActiveRunState,
  hydratePathRewardState,
} = require('../src/engines/DropEngine');

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DECORATION_DRAWER_WIDTH = 138;
type DecorationDrawerSection = 'root' | 'asgard' | 'new-york';

const DECORATION_COLLECTIONS = {
  asgard: [
    {
      id: 'loki-weapon',
      label: 'Loki Weapon',
      image: require('../assets/img/loki_weapon-removebg-preview.png'),
    },
    {
      id: 'storm-breaker',
      label: 'Storm Breaker',
      image: require('../assets/img/stormbreaker.jpeg'),
    },
    {
      id: 'thors-hammer',
      label: "Thor's Hammer",
      image: require('../assets/img/thor_hammer.jpeg'),
    },
  ],
  'new-york': [
    {
      id: 'stark-tower',
      label: 'Stark Tower',
      image: require('../assets/img/stark_tower.png'),
    },
    {
      id: 'captain-america-shield',
      label: 'Captain America Shield',
      image: require('../assets/img/cap_ssheil-removebg-preview.png'),
    },
  ],
} as const;

const MINIMIZED_HEIGHT = 82;
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

type CaptureCelebration = {
  title: string;
  subtitle: string;
};

type TerritoryStatus = 'owned' | 'enemy' | 'contested';
type TerritoryDecoration = {
  id: string;
  territoryId: string;
  label: string;
  image: any;
  coordinate: {
    latitude: number;
    longitude: number;
  };
};

type DecorationItem = {
  id: string;
  label: string;
  image: any;
};

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

function estimateSteps(distanceKm: number) {
  return Math.max(0, Math.round(distanceKm * 1312));
}

function metersToLat(meters: number) {
  return meters / 111_320;
}

function metersToLng(meters: number, atLatitude: number) {
  const cosLat = Math.cos((atLatitude * Math.PI) / 180);
  const safeCos = Math.max(0.1, Math.abs(cosLat));
  return meters / (111_320 * safeCos);
}

function distanceBetweenPointsMeters(
  left: { latitude: number; longitude: number },
  right: { latitude: number; longitude: number },
) {
  const latitudeDeltaMeters = (left.latitude - right.latitude) * 111_320;
  const averageLatitude = (left.latitude + right.latitude) / 2;
  const longitudeDeltaMeters =
    (left.longitude - right.longitude) *
    111_320 *
    Math.max(0.1, Math.abs(Math.cos((averageLatitude * Math.PI) / 180)));

  return Math.sqrt(
    latitudeDeltaMeters * latitudeDeltaMeters +
      longitudeDeltaMeters * longitudeDeltaMeters,
  );
}

function getDecorationCoordinate(
  boundary: LocationPoint[],
  existingCoordinates: Array<{ latitude: number; longitude: number }>,
) {
  const minLatitude = Math.min(...boundary.map(point => point.latitude));
  const maxLatitude = Math.max(...boundary.map(point => point.latitude));
  const minLongitude = Math.min(...boundary.map(point => point.longitude));
  const maxLongitude = Math.max(...boundary.map(point => point.longitude));
  const minimumSpacingMeters = 52;

  let bestCandidate = getPolygonCenter(boundary);
  let bestDistance = -1;

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const candidate = {
      latitude: minLatitude + Math.random() * (maxLatitude - minLatitude),
      longitude: minLongitude + Math.random() * (maxLongitude - minLongitude),
      timestamp: Date.now(),
    };

    if (!isPointInPolygon(candidate, boundary)) {
      continue;
    }

    const nearestDistance = existingCoordinates.length
      ? Math.min(
          ...existingCoordinates.map(existing =>
            distanceBetweenPointsMeters(candidate, existing),
          ),
        )
      : Number.POSITIVE_INFINITY;

    if (nearestDistance >= minimumSpacingMeters) {
      return candidate;
    }

    if (nearestDistance > bestDistance) {
      bestCandidate = candidate;
      bestDistance = nearestDistance;
    }
  }

  if (!isPointInPolygon(bestCandidate, boundary)) {
    return getPolygonCenter(boundary);
  }

  return bestCandidate;
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

  const [activeRun, setActiveRun] = useState<ActiveRun>(
    hydratePathRewardState({
      state: 'idle',
      startTime: null,
      path: [],
      distance: 0,
      duration: 0,
      pausedDuration: 0,
      isNearStart: false,
    }),
  );
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
  const [territoryDecorations, setTerritoryDecorations] = useState<
    TerritoryDecoration[]
  >([]);
  const [isDecorationDrawerOpen, setIsDecorationDrawerOpen] = useState(false);
  const [decorationDrawerSection, setDecorationDrawerSection] =
    useState<DecorationDrawerSection>('root');
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
  const [isHudCollapsed, setIsHudCollapsed] = useState(true);
  const [areFiltersCollapsed, setAreFiltersCollapsed] = useState(true);

  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);
  const hasCenteredOnUser = useRef(false);
  const mockSeedKeyRef = useRef('');
  const mapRef = useRef<MapView>(null);
  const [isSheetMinimized, setIsSheetMinimized] = useState(true);
  const sheetHeight = useRef(new Animated.Value(MINIMIZED_HEIGHT)).current;
  const decorationDrawerTranslateX = useRef(
    new Animated.Value(-(DECORATION_DRAWER_WIDTH + 20)),
  ).current;
  const lastSheetHeight = useRef(MINIMIZED_HEIGHT);
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
  const isSelectedTerritoryOwnedByCurrentUser =
    selectedTerritory?.territory.ownerId === currentUserId;
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
    setIsSheetMinimized(position <= MINIMIZED_HEIGHT + 1);

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
    const snapPoints = [
      MINIMIZED_HEIGHT,
      COLLAPSED_HEIGHT,
      HALF_HEIGHT,
      EXPANDED_HEIGHT,
    ];

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

  const handleToggleCommandDrawer = () => {
    if (isSheetMinimized) {
      snapToPosition(selectedTerritory ? HALF_HEIGHT : COLLAPSED_HEIGHT);
      return;
    }

    snapToPosition(MINIMIZED_HEIGHT);
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

        if (nextHeight >= MINIMIZED_HEIGHT && nextHeight <= EXPANDED_HEIGHT) {
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
    if (!isSelectedTerritoryOwnedByCurrentUser && isDecorationDrawerOpen) {
      setIsDecorationDrawerOpen(false);
      setDecorationDrawerSection('root');
    }
  }, [
    decorationDrawerSection,
    isDecorationDrawerOpen,
    isSelectedTerritoryOwnedByCurrentUser,
  ]);

  useEffect(() => {
    Animated.spring(decorationDrawerTranslateX, {
      toValue: isDecorationDrawerOpen ? 0 : -(DECORATION_DRAWER_WIDTH + 20),
      useNativeDriver: true,
      tension: 56,
      friction: 9,
    }).start();
  }, [decorationDrawerTranslateX, isDecorationDrawerOpen]);

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

  const handleOpenPowerups = () => {
    navigation.navigate('Powerups');
  };

  const handleAddDecoration = () => {
    if (!isSelectedTerritoryOwnedByCurrentUser) {
      return;
    }

    setIsDecorationDrawerOpen(previous => {
      if (previous) {
        setDecorationDrawerSection('root');
      }
      return !previous;
    });
  };

  const handleCloseDecorationDrawer = () => {
    setIsDecorationDrawerOpen(false);
    setDecorationDrawerSection('root');
  };

  const handleDecorationDrawerBack = () => {
    if (decorationDrawerSection === 'root') {
      handleCloseDecorationDrawer();
      return;
    }

    setDecorationDrawerSection('root');
  };

  const handleOpenDecorationSection = (section: Exclude<DecorationDrawerSection, 'root'>) => {
    setDecorationDrawerSection(section);
  };

  const handleSelectDecorationItem = (item: DecorationItem) => {
    if (!selectedTerritory || !isSelectedTerritoryOwnedByCurrentUser) {
      return;
    }

    setTerritoryDecorations(previous => {
      const existingForTerritory = previous.filter(
        decoration => decoration.territoryId === selectedTerritory.territory.id,
      );
      const coordinate = getDecorationCoordinate(
        selectedTerritory.territory.boundary,
        existingForTerritory.map(decoration => decoration.coordinate),
      );

      return [
        ...previous,
        {
          id: `${selectedTerritory.territory.id}-${item.id}-${Date.now()}`,
          territoryId: selectedTerritory.territory.id,
          label: item.label,
          image: item.image,
          coordinate: {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
          },
        },
      ];
    });

    setIsDecorationDrawerOpen(false);
    setDecorationDrawerSection('root');
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

      const newRun = createActiveRunState(userLocation, new Date()) as ActiveRun;

      if (isMounted.current) {
        setActiveRun(newRun);
        setTimer(0);
      }

      navigation.navigate('ActiveRun', {
        initialActiveRun: newRun,
        targetTerritory: selectedTerritory?.territory ?? null,
        runnerProfile: {
          id: currentUserId,
          username: currentUserName,
          color: '#29F0D7',
        },
        onPause: () => setActiveRun(previous => ({ ...previous, state: 'paused' })),
        onResume: () => setActiveRun(previous => ({ ...previous, state: 'running' })),
        onStop: () => {
          setActiveRun(
            hydratePathRewardState({
            state: 'idle',
            startTime: null,
            path: [],
            distance: 0,
            duration: 0,
            pausedDuration: 0,
            isNearStart: false,
            }),
          );
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
        pathRewardSummary: {
          collectedDrops: activeRun.collectedDrops,
          coinsCollected: activeRun.coinsCollected,
          shieldsCollected: activeRun.shieldChargesEarned,
        },
      };

      await Promise.all([saveRun(completedRun), saveTerritory(newTerritory)]);
      await updateUserStats();
      await apiClaimTerritory({
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
      );

      if (isMounted.current) {
        setTerritories(previous => [...previous, newTerritory]);
      }

      const activeMultiplier =
        activeRun.multiplierExpiresAt &&
        activeRun.multiplierExpiresAt > Date.now()
          ? activeRun.captureMultiplier
          : 1;
      const xpEarned = Math.round((activeRun.distance * 90 + 180) * activeMultiplier);
      showCaptureToast(
        `+${xpEarned} XP`,
        `${getTerritoryName(newTerritory)} captured`,
      );
      setSelectedTerritoryId(newTerritory.id);
      setActiveRun(
        hydratePathRewardState({
        state: 'idle',
        startTime: null,
        path: [],
        distance: 0,
        duration: 0,
        pausedDuration: 0,
        isNearStart: false,
        }),
      );
      setTimer(0);
    } catch (error) {
      console.error('Error claiming territory:', error);
      Alert.alert('Error', 'Failed to claim territory. Please try again.');
    }
  };

  const steps = estimateSteps(activeRun.distance);
  const startFabBottom = Animated.add(sheetHeight, 16);
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

                return hydratePathRewardState({
                  ...previous,
                  path: nextPath,
                  distance: nextDistance,
                  isNearStart: isNearLoop,
                });
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

          {territoryDecorations.map(decoration => (
            <Marker
              key={decoration.id}
              coordinate={decoration.coordinate}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.territoryDecorationMarker}>
                <Image
                  source={decoration.image}
                  style={styles.territoryDecorationImage}
                />
              </View>
            </Marker>
          ))}

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
            'rgba(190, 232, 255, 0.32)',
            'rgba(255, 255, 255, 0.04)',
            'rgba(255, 243, 224, 0.42)',
          ]}
          locations={[0, 0.42, 1]}
          style={styles.mapAtmosphere}
        />

        <View pointerEvents="none" style={styles.gridScrim}>
          <View style={styles.scanline} />
          <View style={[styles.scanline, styles.scanlineMid]} />
          <View style={[styles.scanline, styles.scanlineBottom]} />
        </View>

        <Animated.View
          style={[
            styles.decorationDrawer,
            {
              transform: [{ translateX: decorationDrawerTranslateX }],
            },
          ]}
          pointerEvents={isDecorationDrawerOpen ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.decorationDrawerClose}
            onPress={handleDecorationDrawerBack}
          >
            <Icon
              name={
                decorationDrawerSection === 'root'
                  ? 'close-outline'
                  : 'chevron-back-outline'
              }
              size={18}
              color="#F5C15D"
            />
          </TouchableOpacity>

          <View style={styles.decorationDrawerContent}>
            {decorationDrawerSection === 'root' ? (
              <>
                <TouchableOpacity
                  style={styles.decorationOption}
                  onPress={() => handleOpenDecorationSection('asgard')}
                >
                  <View style={styles.decorationBadge}>
                    <Icon name="planet-outline" size={28} color="#67E6FF" />
                  </View>
                  <Text style={styles.decorationLabel}>Asgard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.decorationOption}
                  onPress={() => handleOpenDecorationSection('new-york')}
                >
                  <View
                    style={[styles.decorationBadge, styles.decorationBadgeSecondary]}
                  >
                    <Icon name="business-outline" size={22} color="#F5C15D" />
                  </View>
                  <Text style={styles.decorationLabel}>New York</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {DECORATION_COLLECTIONS[decorationDrawerSection].map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.decorationItem}
                    onPress={() => handleSelectDecorationItem(item)}
                  >
                    <View style={styles.decorationBadge}>
                      <Image source={item.image} style={styles.decorationItemImage} />
                    </View>
                    <Text style={styles.decorationLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </Animated.View>

        <TacticalHud
          playerName={currentUserName}
          territoryCount={ownedTerritories}
          visibleEnemyCount={visibleEnemyCount}
          contestedCount={contestedCount}
          rankTitle={rankTitle}
          gpsReady={!!userLocation}
          collapsed={isHudCollapsed}
          onToggle={() => setIsHudCollapsed(previous => !previous)}
        />

        <View
          style={[
            styles.overlayChipsContainer,
            isHudCollapsed && areFiltersCollapsed
              ? styles.overlayChipsContainerCompact
              : isHudCollapsed
                ? styles.overlayChipsContainerCollapsed
                : styles.overlayChipsContainerExpanded,
          ]}
        >
          {areFiltersCollapsed ? (
            <TouchableOpacity
              style={styles.filtersToggle}
              onPress={() => setAreFiltersCollapsed(false)}
            >
              <Icon name="options-outline" size={16} color="#67E6FF" />
              <Text style={styles.filtersToggleText}>Protocols</Text>
              <Icon name="chevron-down" size={14} color="#F5C15D" />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.filtersToggle}
                onPress={() => setAreFiltersCollapsed(true)}
              >
                <Icon name="options-outline" size={16} color="#67E6FF" />
                <Text style={styles.filtersToggleText}>Protocols</Text>
                <Icon name="chevron-up" size={14} color="#F5C15D" />
              </TouchableOpacity>

              <View style={styles.overlayChipsContent}>
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
                      color={useMockTerritories ? '#0D4D7A' : '#5C7694'}
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
              </View>
            </>
          )}
        </View>

        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleCenterOnUser}
          >
            <Icon name="locate" size={22} color="#2D4663" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowMapTypeOverlay(true)}
          >
            <Icon name="layers-outline" size={22} color="#2D4663" />
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.bottomActionRow, { bottom: startFabBottom }]}>
          <View style={styles.legend}>
            <Text style={styles.legendEyebrow}>TACTICAL INDEX</Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.legendOwned]} />
                <Text style={styles.legendText}>Avengers Zone</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.legendEnemy]} />
                <Text style={styles.legendText}>Hostile Zone</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.legendContested]} />
                <Text style={styles.legendText}>Conflict</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, styles.legendRoute]} />
                <Text style={styles.legendText}>Patrol Path</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.startFab}
            onPress={handleStartRun}
          >
            <LinearGradient
              colors={['#7EEBFF', '#1A7CBE', '#A61C28']}
              style={styles.startFabGradient}
            >
              <View style={styles.startFabCore}>
                <Icon name="footsteps-outline" size={20} color="#F4FBFF" />
                <Text style={styles.startFabText}>START</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

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
                <Icon name="close" size={24} color="#46627F" />
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
                    color={mapType === type ? '#F2A12D' : '#5F7997'}
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
                    <Icon name="checkmark-circle" size={20} color="#F2A12D" />
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
          <View style={styles.bottomSheetHeaderRow}>
            <Text style={styles.bottomSheetEyebrow}>Avengers Field Ops</Text>
            <TouchableOpacity
              style={styles.bottomSheetToggle}
              onPress={handleToggleCommandDrawer}
            >
              <Icon
                name={isSheetMinimized ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#F5C15D"
              />
            </TouchableOpacity>
          </View>
        </View>

        {isSheetMinimized ? null : (
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
              stepCount={steps}
              onStartRun={handleStartRun}
              onChallengeTerritory={handleChallengeTerritory}
              onViewOwner={handleViewOwnerProfile}
            />

            {isSelectedTerritoryOwnedByCurrentUser ? (
              <TouchableOpacity
                style={[styles.powerupsButton, styles.decorationButton]}
                onPress={handleAddDecoration}
              >
                <Icon name="color-wand-outline" size={20} color="#FFF1D8" />
                <Text style={styles.powerupsButtonText}>Add decoration</Text>
                <Icon name="chevron-forward" size={18} color="#FFF1D8" />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.powerupsButton}
              onPress={handleOpenPowerups}
            >
              <Icon name="flash-outline" size={20} color="#FFF1D8" />
              <Text style={styles.powerupsButtonText}>Get Powerups</Text>
              <Icon name="chevron-forward" size={18} color="#FFF1D8" />
            </TouchableOpacity>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF7FF',
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
    backgroundColor: 'rgba(87, 184, 255, 0.12)',
  },
  scanlineMid: {
    top: '54%',
    backgroundColor: 'rgba(242, 161, 45, 0.08)',
  },
  scanlineBottom: {
    top: '82%',
    backgroundColor: 'rgba(255, 139, 94, 0.1)',
  },
  overlayChipsContainer: {
    position: 'absolute',
    left: 16,
    right: 86,
  },
  overlayChipsContainerCollapsed: {
    top: 102,
  },
  overlayChipsContainerCompact: {
    top: 78,
  },
  overlayChipsContainerExpanded: {
    top: 208,
  },
  filtersToggle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 18, 35, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.22)',
  },
  filtersToggleText: {
    color: '#F3F8FF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    fontFamily: UI_FONT,
  },
  overlayChipsContent: {
    gap: 8,
    paddingTop: 10,
    paddingRight: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(13, 24, 41, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(133, 160, 189, 0.24)',
  },
  filterChipActiveTeal: {
    backgroundColor: 'rgba(91, 214, 255, 0.18)',
    borderColor: 'rgba(103, 230, 255, 0.34)',
  },
  filterChipActiveGold: {
    backgroundColor: 'rgba(245, 193, 93, 0.18)',
    borderColor: 'rgba(245, 193, 93, 0.34)',
  },
  filterChipActiveOrange: {
    backgroundColor: 'rgba(166, 28, 40, 0.88)',
    borderColor: 'rgba(215, 75, 91, 0.54)',
  },
  filterChipText: {
    color: '#D5E5F4',
    fontSize: 13,
    fontFamily: UI_FONT,
  },
  filterChipTextDark: {
    color: '#67E6FF',
  },
  filterChipTextDarkWarm: {
    color: '#FFF0D2',
  },
  bottomActionRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  legend: {
    flex: 1,
    maxWidth: '78%',
    backgroundColor: 'rgba(8, 18, 35, 0.94)',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.18)',
  },
  legendEyebrow: {
    color: '#F5C15D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: UI_FONT,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 4,
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
    backgroundColor: '#67E6FF',
  },
  legendEnemy: {
    backgroundColor: '#D84452',
  },
  legendContested: {
    backgroundColor: '#F5C15D',
  },
  legendRoute: {
    backgroundColor: '#92F1FF',
    opacity: 0.7,
  },
  legendText: {
    color: '#DAE8F5',
    fontSize: 11,
    fontFamily: UI_FONT,
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
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(214, 232, 244, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BFD8EE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  startFab: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 193, 93, 0.38)',
    shadowColor: '#081223',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.36,
    shadowRadius: 18,
    elevation: 10,
  },
  startFabGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 68,
    borderRadius: 32,
    padding: 5,
  },
  startFabCore: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 18, 35, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  startFabText: {
    marginTop: 2,
    color: '#F4FBFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    fontFamily: UI_FONT,
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
    fontFamily: UI_FONT,
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
    backgroundColor: 'rgba(255, 250, 243, 0.97)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(240, 210, 156, 0.72)',
  },
  captureTextWrap: {
    alignItems: 'flex-start',
  },
  captureTitle: {
    color: '#8C651B',
    fontSize: 16,
    fontFamily: TITLE_FONT,
  },
  captureSubtitle: {
    color: '#6E89A5',
    fontSize: 12,
    marginTop: 2,
    fontFamily: UI_FONT,
  },
  overlayBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(70, 99, 129, 0.22)',
  },
  mapTypeOverlay: {
    backgroundColor: '#FFF9EF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 38,
    borderTopWidth: 1,
    borderColor: 'rgba(240, 220, 188, 0.9)',
  },
  overlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F2E5D0',
  },
  overlayTitle: {
    color: '#2A4361',
    fontSize: 24,
    fontFamily: TITLE_FONT,
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
    backgroundColor: '#F7FBFF',
    borderWidth: 1,
    borderColor: '#E1EEF8',
  },
  mapTypeOptionActive: {
    backgroundColor: 'rgba(255, 217, 140, 0.24)',
    borderColor: 'rgba(242, 161, 45, 0.32)',
  },
  mapTypeText: {
    flex: 1,
    color: '#5F7997',
    fontSize: 16,
    fontFamily: UI_FONT,
  },
  mapTypeTextActive: {
    color: '#8C651B',
  },
  decorationDrawer: {
    position: 'absolute',
    top: 126,
    left: 0,
    width: DECORATION_DRAWER_WIDTH,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    backgroundColor: 'rgba(7, 16, 31, 0.96)',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: 'rgba(103, 230, 255, 0.26)',
    shadowColor: '#030A13',
    shadowOffset: { width: 6, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 14,
  },
  decorationDrawerClose: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: 10,
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(245, 193, 93, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorationDrawerContent: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 18,
  },
  decorationOption: {
    alignItems: 'center',
    width: '100%',
  },
  decorationItem: {
    alignItems: 'center',
    width: '100%',
  },
  decorationBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(103, 230, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorationBadgeSecondary: {
    marginTop: 2,
  },
  decorationItemImage: {
    width: 52,
    height: 52,
    borderRadius: 16,
    resizeMode: 'contain',
  },
  territoryDecorationMarker: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(7, 16, 31, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  territoryDecorationImage: {
    width: 52,
    height: 52,
    borderRadius: 16,
    resizeMode: 'contain',
  },
  decorationLabel: {
    marginTop: 8,
    marginBottom: 14,
    color: '#FFF1D8',
    fontSize: 18,
    fontFamily: TITLE_FONT,
    letterSpacing: 0.6,
  },
  bottomSheet: {
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
    backgroundColor: 'rgba(103, 230, 255, 0.45)',
  },
  bottomSheetEyebrow: {
    color: '#F5C15D',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontFamily: UI_FONT,
  },
  bottomSheetHeaderRow: {
    width: '100%',
    marginTop: 10,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomSheetToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245, 193, 93, 0.24)',
  },
  sheetScroll: {
    flex: 1,
  },
  powerupsButton: {
    height: 54,
    marginHorizontal: 18,
    marginBottom: 42,
    borderRadius: 18,
    backgroundColor: '#A61C28',
    borderWidth: 1,
    borderColor: '#D74B5B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  decorationButton: {
    marginBottom: 12,
    backgroundColor: '#183456',
    borderColor: '#57B8FF',
  },
  powerupsButtonText: {
    color: '#FFF1D8',
    fontSize: 15,
    fontFamily: UI_FONT,
  },
});

export default RunMap;
