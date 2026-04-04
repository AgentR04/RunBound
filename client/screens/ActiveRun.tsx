import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { ActiveRun as ActiveRunType } from '../types/game';
import {
  calculateCalories,
  calculatePace,
  calculatePathDistance,
  calculateSpeed,
  LocationPoint,
} from '../utils/gpsTracking';
import { isNearStartPoint } from '../utils/territoryUtils';

const { width, height } = Dimensions.get('window');

interface ActiveRunScreenProps {
  navigation: any;
  route: {
    params: {
      initialActiveRun: ActiveRunType;
      onPause: () => void;
      onResume: () => void;
      onStop: () => void;
      onClaim: () => void;
      onRunUpdate: (run: ActiveRunType) => void;
    };
  };
}

const ActiveRunScreen: React.FC<ActiveRunScreenProps> = ({ navigation, route }) => {
  const { initialActiveRun, onPause, onResume, onStop, onClaim, onRunUpdate } = route.params;
  const [activeRun, setActiveRun] = useState(initialActiveRun);
  const [timer, setTimer] = useState(0);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<MapView>(null);

  // Update parent component when run state changes
  useEffect(() => {
    onRunUpdate(activeRun);
  }, [activeRun, onRunUpdate]);

  // Update timer
  useEffect(() => {
    if (activeRun.state === 'running') {
      timerInterval.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    }
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [activeRun.state]);

  // Center map on current location when it updates
  useEffect(() => {
    const currentLocation = activeRun.path[activeRun.path.length - 1];
    if (currentLocation && mapRef.current && activeRun.state === 'running') {
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500,
      );
    }
  }, [activeRun.path]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const distance = activeRun.distance;
  const minimumDistance = 0.005; // 5 meters minimum for meaningful pace
  const pace = distance > minimumDistance ? calculatePace(distance, timer) : '0\'00"';
  const speed = distance > minimumDistance ? calculateSpeed(distance, timer).toFixed(1) : '0.0';
  const calories = calculateCalories(distance);
  const currentLocation = activeRun.path[activeRun.path.length - 1];
  const isNearStart = activeRun.path.length > 10 && currentLocation
    ? isNearStartPoint(currentLocation, activeRun.path[0])
    : false;

  const handlePause = () => {
    onPause();
  };

  const handleResume = () => {
    onResume();
  };

  const handleStop = () => {
    Alert.alert(
      'Stop Run?',
      'Are you sure you want to stop this run? You cannot claim territory if you stop.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
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
        'Territory Too Small',
        'Run a longer path to create a territory!',
      );
      return;
    }
    if (!isNearStart) {
      Alert.alert(
        'Complete the Loop',
        'Return to your starting point to claim territory!',
      );
      return;
    }
    onClaim();
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-down" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activeRun.state === 'running' ? 'Running...' : 'Paused'}
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        {/* Primary Stat - Distance */}
        <View style={styles.primaryStat}>
          <Text style={styles.primaryStatValue}>{distance.toFixed(2)}</Text>
          <Text style={styles.primaryStatLabel}>kilometers</Text>
        </View>

        {/* Secondary Stats Grid */}
        <View style={styles.secondaryStatsGrid}>
          <View style={styles.secondaryStatItem}>
            <Text style={styles.secondaryStatLabel}>Pace</Text>
            <Text style={styles.secondaryStatValue}>{pace}</Text>
            <Text style={styles.secondaryStatUnit}>/km</Text>
          </View>
          <View style={styles.secondaryStatItem}>
            <Text style={styles.secondaryStatLabel}>Time</Text>
            <Text style={styles.secondaryStatValue}>{formatTime(timer)}</Text>
            <Text style={styles.secondaryStatUnit}>duration</Text>
          </View>
          <View style={styles.secondaryStatItem}>
            <Text style={styles.secondaryStatLabel}>Calories</Text>
            <Text style={styles.secondaryStatValue}>{calories}</Text>
            <Text style={styles.secondaryStatUnit}>kcal</Text>
          </View>
        </View>

        {/* Near Start Indicator */}
        {isNearStart && (
          <View style={styles.nearStartBanner}>
            <Icon name="trophy" size={20} color="#FFD700" />
            <Text style={styles.nearStartText}>
              Near Start Point - Ready to Claim!
            </Text>
          </View>
        )}
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: activeRun.path[0]?.latitude || 40.6782,
            longitude: activeRun.path[0]?.longitude || -73.9442,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          followsUserLocation={activeRun.state === 'running'}
          onUserLocationChange={event => {
            const { coordinate } = event.nativeEvent;
            if (coordinate && activeRun.state === 'running') {
              const location: LocationPoint = {
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
                timestamp: Date.now(),
                accuracy: coordinate.accuracy,
                altitude: coordinate.altitude ?? undefined,
                speed: coordinate.speed ?? undefined,
              };

              // Update the active run with new location
              setActiveRun(prev => {
                const newPath = [...prev.path, location];
                const newDistance = calculatePathDistance(newPath);
                const isNear = prev.path.length > 10 && isNearStartPoint(location, prev.path[0]);
                return { ...prev, path: newPath, distance: newDistance, isNearStart: isNear };
              });
            }
          }}
        >
          {/* Render active path */}
          {activeRun.path.length > 1 && (
            <Polyline
              coordinates={activeRun.path}
              strokeColor={isNearStart ? '#FFD700' : '#52FF30'}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </MapView>

        {/* Map Stats Overlay */}
        <View style={styles.mapStatsOverlay}>
          <View style={styles.mapStat}>
            <Icon name="footsteps" size={16} color="#52FF30" />
            <Text style={styles.mapStatText}>
              {activeRun.path.length} points
            </Text>
          </View>
          <View style={styles.mapStat}>
            <Icon name="speedometer" size={16} color="#52FF30" />
            <Text style={styles.mapStatText}>{speed} km/h</Text>
          </View>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlsSection}>
        {isNearStart && (
          <TouchableOpacity style={styles.claimButton} onPress={handleClaim}>
            <Icon name="trophy" size={24} color="#000" />
            <Text style={styles.claimButtonText}>Claim Territory</Text>
          </TouchableOpacity>
        )}

        <View style={styles.runControls}>
          {activeRun.state === 'running' ? (
            <TouchableOpacity style={styles.pauseButton} onPress={handlePause}>
              <Icon name="pause" size={32} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={handleResume}
            >
              <Icon name="play" size={32} color="#000" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
            <Icon name="stop" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  statsSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  primaryStat: {
    alignItems: 'center',
    marginBottom: 24,
  },
  primaryStatValue: {
    color: '#52FF30',
    fontSize: 72,
    fontWeight: '700',
    lineHeight: 80,
  },
  primaryStatLabel: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '500',
  },
  secondaryStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  secondaryStatItem: {
    alignItems: 'center',
  },
  secondaryStatLabel: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  secondaryStatValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  secondaryStatUnit: {
    color: '#666',
    fontSize: 12,
  },
  nearStartBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  nearStartText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapStatsOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  mapStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  mapStatText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  controlsSection: {
    padding: 24,
    gap: 16,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  claimButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  runControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  pauseButton: {
    backgroundColor: '#FF9500',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeButton: {
    backgroundColor: '#52FF30',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ActiveRunScreen;
