import { LocationPoint } from './gpsTracking';

const EARTH_RADIUS_METERS = 6_378_137;
export const MIN_GRID_CELL_SIZE_METERS = 500;
export const DEFAULT_GRID_CELL_SIZE_METERS = 500;

export interface GridCell {
    id: string;
    row: number;
    col: number;
    sizeMeters: number;
    areaKm2: number;
    center: LocationPoint;
    boundary: LocationPoint[];
}

interface PointMeters {
    x: number;
    y: number;
}

function clampLatitude(latitude: number): number {
    return Math.max(-85.05112878, Math.min(85.05112878, latitude));
}

function toMeters(point: { latitude: number; longitude: number }): PointMeters {
    const lat = clampLatitude(point.latitude);
    const x = (point.longitude * Math.PI / 180) * EARTH_RADIUS_METERS;
    const y = EARTH_RADIUS_METERS * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
    return { x, y };
}

function toLatLng(point: PointMeters): { latitude: number; longitude: number } {
    const longitude = (point.x / EARTH_RADIUS_METERS) * (180 / Math.PI);
    const latitude = (2 * Math.atan(Math.exp(point.y / EARTH_RADIUS_METERS)) - Math.PI / 2) * (180 / Math.PI);
    return { latitude, longitude };
}

function pointInPolygon(point: { latitude: number; longitude: number }, polygon: LocationPoint[]): boolean {
    let inside = false;
    const x = point.longitude;
    const y = point.latitude;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].longitude;
        const yi = polygon[i].latitude;
        const xj = polygon[j].longitude;
        const yj = polygon[j].latitude;

        const intersects = ((yi > y) !== (yj > y))
            && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);

        if (intersects) {
            inside = !inside;
        }
    }

    return inside;
}

function normalizePolygon(path: LocationPoint[]): LocationPoint[] {
    if (path.length === 0) return [];

    const first = path[0];
    const last = path[path.length - 1];
    if (first.latitude === last.latitude && first.longitude === last.longitude) {
        return path.slice(0, -1);
    }

    return path;
}

export function getGridCellsForPolygon(
    path: LocationPoint[],
    cellSizeMeters: number = DEFAULT_GRID_CELL_SIZE_METERS
): GridCell[] {
    const polygon = normalizePolygon(path);
    if (polygon.length < 3) {
        return [];
    }

    const sizeMeters = Math.max(MIN_GRID_CELL_SIZE_METERS, cellSizeMeters);
    const projected = polygon.map(toMeters);

    let minX = projected[0].x;
    let maxX = projected[0].x;
    let minY = projected[0].y;
    let maxY = projected[0].y;

    for (const p of projected) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    }

    const startCol = Math.floor(minX / sizeMeters);
    const endCol = Math.floor(maxX / sizeMeters);
    const startRow = Math.floor(minY / sizeMeters);
    const endRow = Math.floor(maxY / sizeMeters);

    const cells: GridCell[] = [];
    const now = Date.now();

    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            const x0 = col * sizeMeters;
            const y0 = row * sizeMeters;
            const x1 = (col + 1) * sizeMeters;
            const y1 = (row + 1) * sizeMeters;

            const centerMeters = { x: x0 + sizeMeters / 2, y: y0 + sizeMeters / 2 };
            const center = toLatLng(centerMeters);

            if (!pointInPolygon(center, polygon)) {
                continue;
            }

            const cornersMeters: PointMeters[] = [
                { x: x0, y: y0 },
                { x: x1, y: y0 },
                { x: x1, y: y1 },
                { x: x0, y: y1 },
            ];

            const boundary: LocationPoint[] = cornersMeters.map(corner => {
                const ll = toLatLng(corner);
                return {
                    latitude: ll.latitude,
                    longitude: ll.longitude,
                    timestamp: now,
                };
            });

            cells.push({
                id: `grid-${sizeMeters}-${row}-${col}`,
                row,
                col,
                sizeMeters,
                areaKm2: (sizeMeters * sizeMeters) / 1_000_000,
                center: {
                    latitude: center.latitude,
                    longitude: center.longitude,
                    timestamp: now,
                },
                boundary,
            });
        }
    }

    return cells;
}
