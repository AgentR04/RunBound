import { LocationPoint, calculateDistance } from './gpsTracking';

export const LOOP_CLOSURE_THRESHOLD = 0.03; // 30 meters
export const MIN_LOOP_POINTS = 10; // Minimum points to form a valid loop
export const MIN_TERRITORY_AREA = 0.001; // Minimum 0.001 km² (1,000 m²)
export const MAX_TERRITORY_AREA = 5; // Maximum 5 km²

export interface PolygonValidation {
  valid: boolean;
  reason?: string;
  area?: number;
}

/**
 * Check if current position is near the start point (loop closure detection)
 */
export function isNearStartPoint(
  currentPoint: LocationPoint,
  startPoint: LocationPoint,
  threshold: number = LOOP_CLOSURE_THRESHOLD
): boolean {
  const distance = calculateDistance(currentPoint, startPoint);
  return distance <= threshold;
}

/**
 * Calculate the area of a polygon using the shoelace formula
 * Returns area in km²
 */
export function calculatePolygonArea(points: LocationPoint[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].longitude * points[j].latitude;
    area -= points[j].longitude * points[i].latitude;
  }

  area = Math.abs(area) / 2;

  // Convert from square degrees to square kilometers
  // This is an approximation - for more accuracy we'd need to consider Earth's curvature
  const DEGREES_TO_KM = 111.32; // Approximate km per degree at equator
  return area * DEGREES_TO_KM * DEGREES_TO_KM;
}

/**
 * Check if a polygon is self-intersecting using the ray casting algorithm
 */
export function isSelfIntersecting(points: LocationPoint[]): boolean {
  const n = points.length;
  if (n < 4) return false;

  for (let i = 0; i < n; i++) {
    const line1Start = points[i];
    const line1End = points[(i + 1) % n];

    for (let j = i + 2; j < n; j++) {
      // Don't check adjacent lines or the closing line
      if (j === n - 1 && i === 0) continue;

      const line2Start = points[j];
      const line2End = points[(j + 1) % n];

      if (doLinesIntersect(line1Start, line1End, line2Start, line2End)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if two line segments intersect
 */
function doLinesIntersect(
  p1: LocationPoint, q1: LocationPoint,
  p2: LocationPoint, q2: LocationPoint
): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  // General case
  if (o1 !== o2 && o3 !== o4) return true;

  // Special cases (collinear points)
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

/**
 * Find orientation of ordered triplet (p, q, r)
 * Returns 0 if collinear, 1 if clockwise, 2 if counterclockwise
 */
function orientation(p: LocationPoint, q: LocationPoint, r: LocationPoint): number {
  const val = (q.latitude - p.latitude) * (r.longitude - q.longitude) -
    (q.longitude - p.longitude) * (r.latitude - q.latitude);

  if (Math.abs(val) < 1e-10) return 0; // collinear
  return val > 0 ? 1 : 2; // clockwise or counterclockwise
}

/**
 * Check if point q lies on segment pr
 */
function onSegment(p: LocationPoint, q: LocationPoint, r: LocationPoint): boolean {
  return q.longitude <= Math.max(p.longitude, r.longitude) &&
    q.longitude >= Math.min(p.longitude, r.longitude) &&
    q.latitude <= Math.max(p.latitude, r.latitude) &&
    q.latitude >= Math.min(p.latitude, r.latitude);
}

/**
 * Validate if a polygon is valid for territory claiming
 */
export function isValidTerritory(path: LocationPoint[]): PolygonValidation {
  if (path.length < MIN_LOOP_POINTS) {
    return {
      valid: false,
      reason: `Path too short. Need at least ${MIN_LOOP_POINTS} points.`
    };
  }

  // Check for self-intersection
  if (isSelfIntersecting(path)) {
    return {
      valid: false,
      reason: 'Path crosses itself'
    };
  }

  // Calculate area
  const area = calculatePolygonArea(path);

  // Check minimum area
  if (area < MIN_TERRITORY_AREA) {
    return {
      valid: false,
      reason: `Territory too small (${(area * 1_000_000).toFixed(0)}m²). Minimum: ${(MIN_TERRITORY_AREA * 1_000_000).toFixed(0)}m²`,
      area
    };
  }

  // Check maximum area
  if (area > MAX_TERRITORY_AREA) {
    return {
      valid: false,
      reason: `Territory too large (${area.toFixed(2)}km²). Maximum: ${MAX_TERRITORY_AREA}km²`,
      area
    };
  }

  return { valid: true, area };
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInPolygon(point: LocationPoint, polygon: LocationPoint[]): boolean {
  const x = point.longitude;
  const y = point.latitude;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if a path intersects with a territory boundary
 */
export function doesPathIntersectTerritory(
  path: LocationPoint[],
  territoryBoundary: LocationPoint[]
): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const pathStart = path[i];
    const pathEnd = path[i + 1];

    for (let j = 0; j < territoryBoundary.length; j++) {
      const boundaryStart = territoryBoundary[j];
      const boundaryEnd = territoryBoundary[(j + 1) % territoryBoundary.length];

      if (doLinesIntersect(pathStart, pathEnd, boundaryStart, boundaryEnd)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get the center point of a polygon (centroid)
 */
export function getPolygonCenter(polygon: LocationPoint[]): LocationPoint {
  let centroidLat = 0;
  let centroidLng = 0;

  for (const point of polygon) {
    centroidLat += point.latitude;
    centroidLng += point.longitude;
  }

  return {
    latitude: centroidLat / polygon.length,
    longitude: centroidLng / polygon.length,
    timestamp: Date.now(),
  };
}

/**
 * Simplify a polygon by removing points that are too close together
 */
export function simplifyPolygon(
  polygon: LocationPoint[],
  tolerance: number = 0.0001 // degrees
): LocationPoint[] {
  if (polygon.length <= 3) return polygon;

  const simplified: LocationPoint[] = [polygon[0]];

  for (let i = 1; i < polygon.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const current = polygon[i];

    const distance = Math.sqrt(
      Math.pow(current.latitude - prev.latitude, 2) +
      Math.pow(current.longitude - prev.longitude, 2)
    );

    if (distance > tolerance) {
      simplified.push(current);
    }
  }

  // Always include the last point
  simplified.push(polygon[polygon.length - 1]);

  return simplified;
}