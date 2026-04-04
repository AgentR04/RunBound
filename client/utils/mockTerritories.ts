import { Territory } from '../types/game';
import { LocationPoint } from './gpsTracking';

const DEFAULT_MUMBAI_LAT = 19.076;
const DEFAULT_MUMBAI_LNG = 72.8777;

const SEEDED_TERRITORY_USERS = [
  {
    ownerId: 'abbcc6b2-48da-4801-b930-f52e10afb493',
    ownerName: 'Aagnya',
    ownerColor: '#57B8FF',
    latOffsetMeters: -520,
    lngOffsetMeters: -360,
    radiusMeters: 178,
  },
  {
    ownerId: 'de9c53db-4759-409e-9dad-a0d2a59078b0',
    ownerName: 'Arshvir',
    ownerColor: '#FF8B5E',
    latOffsetMeters: -140,
    lngOffsetMeters: 460,
    radiusMeters: 168,
  },
  {
    ownerId: 'f6f749ac-062e-407e-a3b4-32b786b03b5a',
    ownerName: 'Kabir',
    ownerColor: '#F5C15D',
    latOffsetMeters: 430,
    lngOffsetMeters: -280,
    radiusMeters: 188,
  },
  {
    ownerId: 'da2bbd54-06cd-4d7d-87c2-5db57fd2f241',
    ownerName: 'Rutu',
    ownerColor: '#B46CFF',
    latOffsetMeters: 360,
    lngOffsetMeters: 420,
    radiusMeters: 174,
  },
] as const;

function metersToLat(meters: number): number {
  return meters / 111_320;
}

function metersToLng(meters: number, atLatitude: number): number {
  const cosLat = Math.cos((atLatitude * Math.PI) / 180);
  const safeCos = Math.max(0.1, Math.abs(cosLat));
  return meters / (111_320 * safeCos);
}

function hashValue(seed: string): number {
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33 + seed.charCodeAt(i)) % 2147483647;
  }

  return Math.abs(hash);
}

function createBlobBoundary(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  timestamp: number,
  seed: string,
): LocationPoint[] {
  const pointCount = 11;
  const boundary: LocationPoint[] = [];

  for (let i = 0; i < pointCount; i += 1) {
    const baseAngle = (Math.PI * 2 * i) / pointCount;
    const wobbleSeed = hashValue(`${seed}:${i}`);
    const radialScale = 0.76 + (wobbleSeed % 20) / 100;
    const twist = (((Math.floor(wobbleSeed / 7) % 9) - 4) * Math.PI) / 120;
    const driftX = (((Math.floor(wobbleSeed / 31) % 9) - 4) / 4) * 16;
    const driftY = (((Math.floor(wobbleSeed / 89) % 9) - 4) / 4) * 16;

    const xMeters =
      Math.cos(baseAngle + twist) * radiusMeters * radialScale + driftX;
    const yMeters =
      Math.sin(baseAngle - twist) * radiusMeters * radialScale + driftY;

    boundary.push({
      latitude: centerLat + metersToLat(yMeters),
      longitude: centerLng + metersToLng(xMeters, centerLat),
      timestamp,
    });
  }

  return boundary;
}

function approximateBlobAreaKm2(radiusMeters: number): number {
  return (Math.PI * radiusMeters * radiusMeters * 0.82) / 1_000_000;
}

export function getMockTerritories(
  centerLat: number = DEFAULT_MUMBAI_LAT,
  centerLng: number = DEFAULT_MUMBAI_LNG,
): Territory[] {
  const now = Date.now();

  return SEEDED_TERRITORY_USERS.map((user, index) => {
    const territoryCenterLat = centerLat + metersToLat(user.latOffsetMeters);
    const territoryCenterLng =
      centerLng + metersToLng(user.lngOffsetMeters, centerLat);

    return {
      id: `seeded-territory-${index + 1}`,
      ownerId: user.ownerId,
      ownerName: user.ownerName,
      ownerColor: user.ownerColor,
      boundary: createBlobBoundary(
        territoryCenterLat,
        territoryCenterLng,
        user.radiusMeters,
        now,
        user.ownerId,
      ),
      area: approximateBlobAreaKm2(user.radiusMeters),
      claimedAt: new Date(now - (index + 2) * 86_400_000),
      lastDefended: null,
      strength: 76 + index * 6,
      isUnderChallenge: false,
      runId: `seeded-run-${index + 1}`,
    };
  });
}
