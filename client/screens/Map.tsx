import React, { useEffect, useRef, useState } from 'react';
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
import MapView, { Polygon, Polyline, Region, Circle } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSocket } from '../context/SocketContext';
import { claimTerritory as apiClaimTerritory, fetchTerritories } from '../services/api';
import { ActiveRun, Run, Territory } from '../types/game';
import {
  calculateCalories,
  calculatePace,
  calculatePathDistance,
  calculateSpeed,
  LocationPoint,
} from '../utils/gpsTracking';
import {
  saveRun,
  saveTerritory,
  updateUserStats,
} from '../utils/storage';
import { isNearStartPoint, isValidTerritory } from '../utils/territoryUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 200;
const HALF_HEIGHT = SCREEN_HEIGHT * 0.5;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.85;

const RunMap = ({ navigation }: { navigation: any }) => {
  const { socket } = useSocket();

  // === ALL useState HOOKS ===
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
    latitude: 40.6782,
    longitude: -73.9442,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [showMapTypeOverlay, setShowMapTypeOverlay] = useState(false);
  const [overlays, setOverlays] = useState({
    territories: true,
    myRoutes: false,
    heatmap: false,
    popularRoutes: false,
    elevation: false,
  });
  const [heatmapPoints, setHeatmapPoints] = useState<Array<{ lat: number; lng: number; intensity: number }>>([]);

  // === ALL useRef HOOKS ===
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);
  const mapRef = useRef<MapView>(null);
  const sheetHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const lastSheetHeight = useRef(COLLAPSED_HEIGHT);
  const scrollViewRef = useRef<ScrollView>(null);
  const isAnimating = useRef(false);

  // === HELPER FUNCTIONS ===
  const snapToPosition = (position: number) => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    lastSheetHeight.current = position;

    Animated.spring(sheetHeight, {
      toValue: position,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start(() => {
      isAnimating.current = false;
    });
  };

  const getNextSnapPoint = (gestureDirection: number) => {
    const snapPoints = [COLLAPSED_HEIGHT, HALF_HEIGHT, EXPANDED_HEIGHT];
    if (gestureDirection < -10) {
      const nextPoint = snapPoints.find(p => p > lastSheetHeight.current);
      return nextPoint || EXPANDED_HEIGHT;
    } else if (gestureDirection > 10) {
      const nextPoint = [...snapPoints].reverse().find(p => p < lastSheetHeight.current);
      return nextPoint || COLLAPSED_HEIGHT;
    }
    return lastSheetHeight.current;
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSafePace = () => {
    try {
      const minimumDistance = 0.005; // 5 meters minimum for meaningful pace
      return activeRun.distance > minimumDistance ? calculatePace(activeRun.distance, timer) : "0'00\"";
    } catch {
      return "0'00\"";
    }
  };

  const getSafeSpeed = () => {
    try {
      const minimumDistance = 0.005; // 5 meters minimum for meaningful speed
      return activeRun.distance > minimumDistance ? calculateSpeed(activeRun.distance, timer).toFixed(1) : '0.0';
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

  const generateHeatmapPoints = (centerLat: number, centerLng: number, count: number = 100) => {
    const points = [];
    const radius = 0.02; // ~2km radius
    
    for (let i = 0; i < count; i++) {
      // Random point within radius
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radius;
      
      const lat = centerLat + distance * Math.cos(angle);
      const lng = centerLng + distance * Math.sin(angle);
      const intensity = Math.random(); // 0-1 intensity
      
      points.push({ lat, lng, intensity });
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
        message: 'RunBound needs access to your location to track your runs and claim territory.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  // PanResponder for bottom sheet
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isAnimating.current) return false;
        const isDraggingVertically = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        if (lastSheetHeight.current === EXPANDED_HEIGHT && gestureState.dy < 0) {
          return false;
        }
        return isDraggingVertically && Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        sheetHeight.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = lastSheetHeight.current - gestureState.dy;
        if (newHeight >= COLLAPSED_HEIGHT && newHeight <= EXPANDED_HEIGHT) {
          sheetHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const targetHeight = getNextSnapPoint(gestureState.dy);
        snapToPosition(targetHeight);
      },
    })
  ).current;

  // === ALL useEffect HOOKS ===

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  // Load territories from server on mount, fall back to local storage
  useEffect(() => {
    const loadData = async () => {
      try {
        const loaded = await fetchTerritories();
        if (isMounted.current) {
          setTerritories(loaded as Territory[]);
        }
      } catch {
        // Server unavailable — nothing to show yet
      }
    };
    loadData();
  }, []);

  // Real-time: merge incoming territories from other players
  useEffect(() => {
    if (!socket) return;

    const onTerritoryNew = (territory: Territory) => {
      if (!isMounted.current) return;
      setTerritories(prev => {
        // Ignore duplicates (our own claim already appended locally)
        if (prev.some(t => t.id === territory.id)) return prev;
        return [...prev, territory];
      });
    };

    socket.on('territory:new', onTerritoryNew);
    return () => {
      socket.off('territory:new', onTerritoryNew);
    };
  }, [socket]);

  // Request permission on mount (location updates come from MapView callback)
  useEffect(() => {
    const setupPermission = async () => {
      // Wait for all interactions/animations to complete before requesting permission
      const handle = InteractionManager.runAfterInteractions(async () => {
        if (!isMounted.current) return;
        
        try {
          const granted = await requestForegroundLocationPermission();
          if (isMounted.current) {
            setHasLocationPermission(granted);
          }
          if (!granted) {
            Alert.alert('Permission Required', 'Location permission required to track runs');
          }
        } catch (error) {
          console.error('Permission error:', error);
        }
      });
    };

    setupPermission();
  }, []);

  // Timer effect
  useEffect(() => {
    if (activeRun.state === 'running') {
      timerInterval.current = setInterval(() => {
        if (isMounted.current) {
          setTimer(prev => prev + 1);
        }
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    }
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    };
  }, [activeRun.state]);

  // Generate heatmap when overlay is toggled
  useEffect(() => {
    if (overlays.heatmap && userLocation) {
      const points = generateHeatmapPoints(userLocation.latitude, userLocation.longitude);
      setHeatmapPoints(points);
    } else {
      setHeatmapPoints([]);
    }
  }, [overlays.heatmap, userLocation?.latitude, userLocation?.longitude]);

  // === EVENT HANDLERS ===
  
  const handleCenterOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const handleToggleMapType = () => {
    setShowMapTypeOverlay(true);
  };

  const handleSelectMapType = (type: 'standard' | 'satellite' | 'hybrid') => {
    setMapType(type);
    setShowMapTypeOverlay(false);
  };

  const handleToggleOverlay = (overlayKey: keyof typeof overlays) => {
    setOverlays(prev => ({ ...prev, [overlayKey]: !prev[overlayKey] }));
  };
  
  const handleStartRun = async () => {
    try {
      const permissionGranted = hasLocationPermission || await requestForegroundLocationPermission();
      if (!permissionGranted) {
        if (isMounted.current) {
          setHasLocationPermission(false);
        }
        Alert.alert('Permission Required', 'Location permission required to track runs');
        return;
      }

      if (isMounted.current) {
        setHasLocationPermission(true);
      }

      if (!userLocation) {
        Alert.alert('Locating You', 'Waiting for GPS signal. Keep the map open briefly and tap Start Run again.');
        return;
      }

      if (isMounted.current) {
        const newRun = {
          state: 'running' as const,
          startTime: new Date(),
          path: [userLocation],
          distance: 0,
          duration: 0,
          pausedDuration: 0,
          isNearStart: false,
        };
        setActiveRun(newRun);
        setTimer(0);

        // Navigate to ActiveRun screen
        navigation.navigate('ActiveRun', {
          initialActiveRun: newRun,
          onPause: () => setActiveRun(prev => ({ ...prev, state: 'paused' })),
          onResume: () => setActiveRun(prev => ({ ...prev, state: 'running' })),
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
      }
    } catch (error) {
      console.error('Error starting run:', error);
    }
  };

  const handlePauseRun = () => {
    try {
      if (isMounted.current) {
        setActiveRun(prev => ({ ...prev, state: 'paused' }));
      }
    } catch (error) {
      console.error('Error pausing run:', error);
    }
  };

  const handleResumeRun = () => {
    try {
      if (isMounted.current) {
        setActiveRun(prev => ({ ...prev, state: 'running' }));
      }
    } catch (error) {
      console.error('Error resuming run:', error);
    }
  };

  const handleStopRun = () => {
    try {
      if (isMounted.current) {
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
      }
    } catch (error) {
      console.error('Error stopping run:', error);
    }
  };

  const handleClaimTerritory = async () => {
    try {
      if (activeRun.path.length < 10) {
        Alert.alert('Territory Too Small', 'Run a longer path to create a territory!');
        return;
      }

      const polygon = [...activeRun.path];
      if (polygon.length > 0) {
        polygon.push(polygon[0]); // Close the loop
      }

      const validation = isValidTerritory(polygon);
      if (!validation.valid) {
        Alert.alert('Cannot Claim Territory', validation.reason || 'Invalid territory');
        return;
      }

      const pace = getSafePace();
      const speed = getSafeSpeed();
      const calories = getSafeCalories();

      const newTerritory: Territory = {
        id: `territory-${Date.now()}`,
        ownerId: 'user-1',
        ownerName: 'You',
        ownerColor: '#52FF30',
        boundary: activeRun.path,
        area: validation.area || 0,
        claimedAt: new Date(),
        lastDefended: null,
        strength: 100,
        isUnderChallenge: false,
        runId: `run-${Date.now()}`,
      };

      const completedRun: Run = {
        id: newTerritory.runId,
        userId: 'user-1',
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
        calories: calories,
      };

      await Promise.all([
        saveTerritory(newTerritory),
        saveRun(completedRun),
        updateUserStats(activeRun.distance, validation.area),
        // Persist to server + broadcast to all connected clients
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
        }).catch(err => console.warn('[api] territory claim failed:', err.message)),
      ]);

      if (isMounted.current) {
        setTerritories(prev => [...prev, newTerritory]);
      }

      Alert.alert(
        '🏆 Territory Claimed!',
        `Area: ${((validation.area || 0) * 1_000_000).toFixed(0)}m²\nDistance: ${activeRun.distance.toFixed(2)}km\nTime: ${formatTime(timer)}`,
        [{ text: 'Awesome!', style: 'default' }]
      );

      handleStopRun();
    } catch (error) {
      console.error('Error claiming territory:', error);
      Alert.alert('Error', 'Failed to claim territory. Please try again.');
    }
  };

  // Calculate display values
  const pace = getSafePace();
  const speed = getSafeSpeed();
  const calories = getSafeCalories();

  // === RENDER ===
  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          mapType={mapType}
          initialRegion={mapRegion}
          region={userLocation ? {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          } : mapRegion}
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={false}
          followsUserLocation={activeRun.state === 'running'}
          onRegionChangeComplete={setMapRegion}
          onUserLocationChange={(event) => {
            const { coordinate } = event.nativeEvent;
            if (!coordinate || typeof coordinate.latitude !== 'number' || typeof coordinate.longitude !== 'number') {
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

            if (activeRun.state === 'running') {
              setActiveRun(prev => {
                const newPath = [...prev.path, location];
                const newDistance = calculatePathDistance(newPath);
                const isNear = prev.path.length > 10 && isNearStartPoint(location, prev.path[0]);
                return { ...prev, path: newPath, distance: newDistance, isNearStart: isNear };
              });
            }
          }}
        >
          {/* Render existing territories */}
          {overlays.territories && territories.map(territory => {
            try {
              const validBoundary = territory.boundary.filter(
                p => typeof p.latitude === 'number' && typeof p.longitude === 'number'
              );
              if (validBoundary.length < 3) return null;
              
              // Convert hex color to rgba with transparency
              const hexToRgba = (hex: string, alpha: number) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
              };

              return (
                <Polygon
                  key={territory.id}
                  coordinates={validBoundary}
                  fillColor={hexToRgba(territory.ownerColor, 0.3)}
                  strokeColor={territory.ownerColor}
                  strokeWidth={2}
                />
              );
            } catch {
              return null;
            }
          })}

          {/* Render active run path */}
          {activeRun.state !== 'idle' && activeRun.path.length > 1 && (() => {
            try {
              const validPath = activeRun.path.filter(
                p => typeof p.latitude === 'number' && typeof p.longitude === 'number'
              );
              if (validPath.length < 2) return null;
              return (
                <Polyline
                  key="active-path"
                  coordinates={validPath}
                  strokeColor={activeRun.isNearStart ? '#FFD700' : '#52FF30'}
                  strokeWidth={activeRun.isNearStart ? 6 : 4}
                  lineCap="round"
                  lineJoin="round"
                />
              );
            } catch {
              return null;
            }
          })()}

          {/* Render heatmap dots */}
          {overlays.heatmap && heatmapPoints.map((point, index) => (
            <Circle
              key={`heatmap-${index}`}
              center={{ latitude: point.lat, longitude: point.lng }}
              radius={20 + point.intensity * 30} // Radius 20-50m based on intensity
              fillColor={`rgba(255, 107, 53, ${0.3 + point.intensity * 0.5})`} // Orange with varying opacity
              strokeColor="transparent"
            />
          ))}

          {/* Render popular routes dots */}
          {overlays.popularRoutes && heatmapPoints.map((point, index) => (
            <Circle
              key={`popular-${index}`}
              center={{ latitude: point.lat, longitude: point.lng }}
              radius={15 + point.intensity * 25}
              fillColor={`rgba(82, 255, 48, ${0.2 + point.intensity * 0.4})`} // Green dots
              strokeColor="transparent"
            />
          ))}
        </MapView>

        {/* Header Overlay */}
        <View style={styles.headerOverlay}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>
              {activeRun.state === 'idle' && 'Ready to Run'}
              {activeRun.state === 'running' && 'Running...'}
              {activeRun.state === 'paused' && 'Run Paused'}
            </Text>
            {activeRun.isNearStart && (
              <TouchableOpacity style={styles.claimButton} onPress={handleClaimTerritory}>
                <Icon name="trophy" size={16} color="#000" />
                <Text style={styles.claimButtonText}>Close Loop!</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.statusBar}>
            <View style={styles.statusItem}>
              <Icon name="location" size={12} color="#52FF30" />
              <Text style={styles.statusText}>{userLocation ? 'GPS Connected' : 'Waiting GPS...'}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusText}>
                {activeRun.isNearStart ? '⚡ Near Start Point!' : `${territories.length} Territories`}
              </Text>
            </View>
          </View>
        </View>

        {/* Overlay Filter Chips */}
        <View style={styles.overlayChipsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.overlayChipsContent}
          >
            <TouchableOpacity 
              style={[styles.filterChip, overlays.territories && styles.filterChipActive]}
              onPress={() => handleToggleOverlay('territories')}
            >
              <Icon name="flag" size={14} color={overlays.territories ? '#000' : '#fff'} />
              <Text style={[styles.filterChipText, overlays.territories && styles.filterChipTextActive]}>
                Territories
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterChip, overlays.myRoutes && styles.filterChipActive]}
              onPress={() => handleToggleOverlay('myRoutes')}
            >
              <Icon name="footsteps" size={14} color={overlays.myRoutes ? '#000' : '#fff'} />
              <Text style={[styles.filterChipText, overlays.myRoutes && styles.filterChipTextActive]}>
                My Routes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterChip, overlays.heatmap && styles.filterChipActive]}
              onPress={() => handleToggleOverlay('heatmap')}
            >
              <Icon name="analytics" size={14} color={overlays.heatmap ? '#000' : '#fff'} />
              <Text style={[styles.filterChipText, overlays.heatmap && styles.filterChipTextActive]}>
                Heatmap
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterChip, overlays.popularRoutes && styles.filterChipActive]}
              onPress={() => handleToggleOverlay('popularRoutes')}
            >
              <Icon name="trending-up" size={14} color={overlays.popularRoutes ? '#000' : '#fff'} />
              <Text style={[styles.filterChipText, overlays.popularRoutes && styles.filterChipTextActive]}>
                Popular
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterChip, overlays.elevation && styles.filterChipActive]}
              onPress={() => handleToggleOverlay('elevation')}
            >
              <Icon name="bar-chart" size={14} color={overlays.elevation ? '#000' : '#fff'} />
              <Text style={[styles.filterChipText, overlays.elevation && styles.filterChipTextActive]}>
                Elevation
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.controlButton} onPress={handleCenterOnUser}>
            <Icon name="navigate-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={handleToggleMapType}>
            <Icon name="layers-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Type Overlay */}
      <Modal
        visible={showMapTypeOverlay}
        transparent={true}
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
              <Text style={styles.overlayTitle}>Map Type</Text>
              <TouchableOpacity onPress={() => setShowMapTypeOverlay(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.overlaySection}>
              <View style={styles.mapTypeOptions}>
                <TouchableOpacity 
                  style={[styles.mapTypeOption, mapType === 'standard' && styles.mapTypeOptionActive]}
                  onPress={() => handleSelectMapType('standard')}
                >
                  <Icon name="map-outline" size={24} color={mapType === 'standard' ? '#52FF30' : '#fff'} />
                  <Text style={[styles.mapTypeText, mapType === 'standard' && styles.mapTypeTextActive]}>
                    Standard
                  </Text>
                  {mapType === 'standard' && <Icon name="checkmark-circle" size={20} color="#52FF30" />}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.mapTypeOption, mapType === 'satellite' && styles.mapTypeOptionActive]}
                  onPress={() => handleSelectMapType('satellite')}
                >
                  <Icon name="globe-outline" size={24} color={mapType === 'satellite' ? '#52FF30' : '#fff'} />
                  <Text style={[styles.mapTypeText, mapType === 'satellite' && styles.mapTypeTextActive]}>
                    Satellite
                  </Text>
                  {mapType === 'satellite' && <Icon name="checkmark-circle" size={20} color="#52FF30" />}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.mapTypeOption, mapType === 'hybrid' && styles.mapTypeOptionActive]}
                  onPress={() => handleSelectMapType('hybrid')}
                >
                  <Icon name="layers-outline" size={24} color={mapType === 'hybrid' ? '#52FF30' : '#fff'} />
                  <Text style={[styles.mapTypeText, mapType === 'hybrid' && styles.mapTypeTextActive]}>
                    Hybrid
                  </Text>
                  {mapType === 'hybrid' && <Icon name="checkmark-circle" size={20} color="#52FF30" />}
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bottom Sheet */}
      <Animated.View
        style={[styles.bottomSheet, { height: sheetHeight }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
        </View>
        
        <ScrollView
          ref={scrollViewRef}
          style={styles.statsSection}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          nestedScrollEnabled={true}
        >
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>{activeRun.distance.toFixed(2)}</Text>
              <Text style={styles.statUnit}>km</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Pace</Text>
              <Text style={styles.statValue}>{pace}</Text>
              <Text style={styles.statUnit}>/km</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg Speed</Text>
              <Text style={styles.statValue}>{speed}</Text>
              <Text style={styles.statUnit}>km/h</Text>
            </View>
          </View>

          {/* Time Display */}
          <View style={styles.timerSection}>
            <Text style={styles.timerLabel}>Duration</Text>
            <Text style={styles.timerValue}>{formatTime(timer)}</Text>
          </View>

          {/* Additional Stats */}
          <View style={styles.secondaryStats}>
            <View style={styles.secondaryStatItem}>
              <Icon name="flame-outline" size={20} color="#FF6B35" />
              <Text style={styles.secondaryStatValue}>{calories}</Text>
              <Text style={styles.secondaryStatLabel}>kcal</Text>
            </View>
            <View style={styles.secondaryStatItem}>
              <Icon name="footsteps-outline" size={20} color="#52FF30" />
              <Text style={styles.secondaryStatValue}>{activeRun.path.length}</Text>
              <Text style={styles.secondaryStatLabel}>points</Text>
            </View>
            <View style={styles.secondaryStatItem}>
              <Icon name="map-outline" size={20} color="#4A90D9" />
              <Text style={styles.secondaryStatValue}>{territories.length}</Text>
              <Text style={styles.secondaryStatLabel}>zones</Text>
            </View>
          </View>

          {/* Control Buttons */}
          <View style={styles.controlsSection}>
            {activeRun.state === 'idle' && (
              <TouchableOpacity style={styles.startButton} onPress={handleStartRun}>
                <Icon name="play" size={32} color="#000" />
                <Text style={styles.startButtonText}>Start Run</Text>
              </TouchableOpacity>
            )}
            {activeRun.state === 'running' && (
              <View style={styles.runningControls}>
                <TouchableOpacity style={styles.pauseButton} onPress={handlePauseRun}>
                  <Icon name="pause" size={28} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.stopButton} onPress={handleStopRun}>
                  <Icon name="stop" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            {activeRun.state === 'paused' && (
              <View style={styles.runningControls}>
                <TouchableOpacity style={styles.resumeButton} onPress={handleResumeRun}>
                  <Icon name="play" size={28} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.stopButton} onPress={handleStopRun}>
                  <Icon name="stop" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  claimButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    color: '#aaa',
    fontSize: 12,
  },
  overlayChipsContainer: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  overlayChipsContent: {
    paddingRight: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#52FF30',
    borderColor: '#52FF30',
  },
  filterChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#000',
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 190,
    gap: 8,
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 10,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
  },
  statsSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  statUnit: {
    color: '#52FF30',
    fontSize: 12,
    marginTop: 2,
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#252525',
    borderRadius: 12,
  },
  timerLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  timerValue: {
    color: '#52FF30',
    fontSize: 48,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  secondaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  secondaryStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  secondaryStatValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryStatLabel: {
    color: '#666',
    fontSize: 11,
  },
  controlsSection: {
    paddingBottom: 40,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#52FF30',
    paddingVertical: 16,
    borderRadius: 30,
    gap: 8,
  },
  startButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  runningControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  pauseButton: {
    backgroundColor: '#FF9500',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeButton: {
    backgroundColor: '#52FF30',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  mapTypeOverlay: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  overlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  overlaySection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  mapTypeOptions: {
    gap: 8,
  },
  mapTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    gap: 12,
  },
  mapTypeOptionActive: {
    backgroundColor: 'rgba(82, 255, 48, 0.1)',
    borderWidth: 1,
    borderColor: '#52FF30',
  },
  overlayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    gap: 12,
  },
  overlayToggleActive: {
    backgroundColor: 'rgba(82, 255, 48, 0.1)',
    borderWidth: 1,
    borderColor: '#52FF30',
  },
  mapTypeText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  mapTypeTextActive: {
    color: '#52FF30',
  },
});

export default RunMap;
