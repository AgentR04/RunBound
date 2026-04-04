import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
}

export type LocationCallback = (location: LocationPoint) => void;

let watchId: number | null = null;

/**
 * Request location permissions for iOS and Android
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      return auth === 'granted';
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'RunBound needs access to your location to track your runs and claim territory.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return false;
  } catch (err) {
    console.warn('Error requesting location permission:', err);
    return false;
  }
}

/**
 * Get current location once
 */
export async function getCurrentLocation(): Promise<LocationPoint | null> {
  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: position.timestamp,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          speed: position.coords.speed || undefined,
        });
      },
      (error) => {
        console.warn('Error getting current location:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 60000,
        maximumAge: 10000,
      }
    );
  });
}

/**
 * Start tracking user location with continuous updates
 */
export function startLocationTracking(
  callback: LocationCallback,
  interval: number = 5000 // Update every 5 seconds
): void {
  if (watchId !== null) {
    console.warn('Location tracking already started');
    return;
  }

  watchId = Geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: position.timestamp,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude || undefined,
        speed: position.coords.speed || undefined,
      });
    },
    (error) => {
      console.warn('Location tracking error:', error);
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 5, // Minimum distance (meters) to trigger update
      interval: interval,
      fastestInterval: 3000, // Fastest rate for updates
      showLocationDialog: true,
      forceRequestLocation: true,
    }
  );
}

/**
 * Stop tracking user location
 */
export function stopLocationTracking(): void {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  point1: LocationPoint,
  point2: LocationPoint
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.latitude - point1.latitude);
  const dLon = toRad(point2.longitude - point1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.latitude)) *
    Math.cos(toRad(point2.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate total distance of a path
 */
export function calculatePathDistance(path: LocationPoint[]): number {
  if (path.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < path.length; i++) {
    totalDistance += calculateDistance(path[i - 1], path[i]);
  }

  return totalDistance;
}

/**
 * Calculate pace in min/km format
 */
export function calculatePace(distanceKm: number, durationSeconds: number): string {
  if (distanceKm === 0) return "0'00\"";

  const paceSeconds = durationSeconds / distanceKm;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);

  return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
}

/**
 * Calculate speed in km/h
 */
export function calculateSpeed(distanceKm: number, durationSeconds: number): number {
  if (durationSeconds === 0) return 0;
  return (distanceKm / durationSeconds) * 3600;
}

/**
 * Estimate calories burned (rough estimate)
 * Based on: calories = distance(km) * weight(kg) * 1.036
 * Using average weight of 70kg
 */
export function calculateCalories(distanceKm: number, weight: number = 70): number {
  return Math.round(distanceKm * weight * 1.036);
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
