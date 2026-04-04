import { Territory } from '../types/game';
import { LocationPoint } from './gpsTracking';

const GRID_CELL_SIZE_METERS = 500;
const GRID_CELL_AREA_KM2 = (GRID_CELL_SIZE_METERS * GRID_CELL_SIZE_METERS) / 1_000_000;
const GRID_RADIUS = 5; // Produces an 11x11 square-grid neighborhood

const MOCK_OWNERS = [
    { ownerId: 'mock-user-1', ownerName: 'Alex', ownerColor: '#52FF30' },
    { ownerId: 'mock-user-2', ownerName: 'Sam', ownerColor: '#2EC4FF' },
    { ownerId: 'mock-user-3', ownerName: 'Jordan', ownerColor: '#FF6B35' },
    { ownerId: 'mock-user-4', ownerName: 'Taylor', ownerColor: '#FFD166' },
    { ownerId: 'mock-user-5', ownerName: 'Casey', ownerColor: '#D76CFF' },
    { ownerId: 'mock-user-6', ownerName: 'Riley', ownerColor: '#43C59E' },
];

function metersToLat(meters: number): number {
    return meters / 111_320;
}

function metersToLng(meters: number, atLatitude: number): number {
    const cosLat = Math.cos((atLatitude * Math.PI) / 180);
    const safeCos = Math.max(0.1, Math.abs(cosLat));
    return meters / (111_320 * safeCos);
}

function squareBoundary(
    centerLat: number,
    centerLng: number,
    sideMeters: number,
    timestamp: number
): LocationPoint[] {
    const half = sideMeters / 2;
    const dLat = metersToLat(half);
    const dLng = metersToLng(half, centerLat);

    return [
        { latitude: centerLat - dLat, longitude: centerLng - dLng, timestamp },
        { latitude: centerLat - dLat, longitude: centerLng + dLng, timestamp },
        { latitude: centerLat + dLat, longitude: centerLng + dLng, timestamp },
        { latitude: centerLat + dLat, longitude: centerLng - dLng, timestamp },
    ];
}

function parseCellKey(key: string): { row: number; col: number } {
    const [row, col] = key.split(':').map(Number);
    return { row, col };
}

function cellKey(row: number, col: number): string {
    return `${row}:${col}`;
}

function componentBoundary(
    centerLat: number,
    centerLng: number,
    minRow: number,
    maxRow: number,
    minCol: number,
    maxCol: number,
    timestamp: number
): LocationPoint[] {
    const minY = (minRow - 0.5) * GRID_CELL_SIZE_METERS;
    const maxY = (maxRow + 0.5) * GRID_CELL_SIZE_METERS;
    const minX = (minCol - 0.5) * GRID_CELL_SIZE_METERS;
    const maxX = (maxCol + 0.5) * GRID_CELL_SIZE_METERS;

    return [
        {
            latitude: centerLat + metersToLat(minY),
            longitude: centerLng + metersToLng(minX, centerLat),
            timestamp,
        },
        {
            latitude: centerLat + metersToLat(minY),
            longitude: centerLng + metersToLng(maxX, centerLat),
            timestamp,
        },
        {
            latitude: centerLat + metersToLat(maxY),
            longitude: centerLng + metersToLng(maxX, centerLat),
            timestamp,
        },
        {
            latitude: centerLat + metersToLat(maxY),
            longitude: centerLng + metersToLng(minX, centerLat),
            timestamp,
        },
    ];
}

export function getMockTerritories(
    centerLat: number = 40.6782,
    centerLng: number = -73.9442
): Territory[] {
    const now = Date.now();
    const territories: Territory[] = [];
    const ownership = new Map<string, number>();

    for (let row = -GRID_RADIUS; row <= GRID_RADIUS; row++) {
        for (let col = -GRID_RADIUS; col <= GRID_RADIUS; col++) {
            const macroRow = Math.floor((row + GRID_RADIUS) / 2);
            const macroCol = Math.floor((col + GRID_RADIUS) / 2);

            // Sparse holes improve readability of region boundaries.
            const occupancySeed = Math.abs(macroRow * 29 + macroCol * 31 + row * 7 + col * 11) % 100;
            if (occupancySeed < 8) {
                continue;
            }

            const ownerIndex = Math.abs(macroRow * 5 + macroCol * 7 + macroRow * macroCol * 3) % MOCK_OWNERS.length;
            ownership.set(cellKey(row, col), ownerIndex);
        }
    }

    const visited = new Set<string>();
    const directions = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 },
    ];
    let regionIndex = 0;

    for (const [startKey, ownerIndex] of ownership.entries()) {
        if (visited.has(startKey)) {
            continue;
        }

        regionIndex += 1;
        const owner = MOCK_OWNERS[ownerIndex];
        const queue: string[] = [startKey];
        visited.add(startKey);

        let minRow = Number.POSITIVE_INFINITY;
        let maxRow = Number.NEGATIVE_INFINITY;
        let minCol = Number.POSITIVE_INFINITY;
        let maxCol = Number.NEGATIVE_INFINITY;
        let cellCount = 0;

        while (queue.length > 0) {
            const currentKey = queue.shift()!;
            const { row, col } = parseCellKey(currentKey);

            minRow = Math.min(minRow, row);
            maxRow = Math.max(maxRow, row);
            minCol = Math.min(minCol, col);
            maxCol = Math.max(maxCol, col);
            cellCount += 1;

            for (const direction of directions) {
                const nextRow = row + direction.dr;
                const nextCol = col + direction.dc;
                const nextKey = cellKey(nextRow, nextCol);

                if (visited.has(nextKey)) {
                    continue;
                }

                if (ownership.get(nextKey) !== ownerIndex) {
                    continue;
                }

                visited.add(nextKey);
                queue.push(nextKey);
            }
        }

        const ageDays = (regionIndex * 3 + ownerIndex * 5) % 14;
        const strength = 70 + ((regionIndex * 11 + ownerIndex * 17) % 31);

        territories.push({
            id: `mock-territory-region-${regionIndex}`,
            ownerId: owner.ownerId,
            ownerName: owner.ownerName,
            ownerColor: owner.ownerColor,
            boundary: componentBoundary(centerLat, centerLng, minRow, maxRow, minCol, maxCol, now),
            area: cellCount * GRID_CELL_AREA_KM2,
            claimedAt: new Date(now - ageDays * 86_400_000),
            lastDefended: null,
            strength,
            isUnderChallenge: false,
            runId: `mock-run-region-${regionIndex}`,
        });
    }

    return territories;
}
