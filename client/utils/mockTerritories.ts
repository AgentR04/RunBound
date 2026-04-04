import {
  MarathonLeaderboardEntry,
  MarathonTerritory,
  Territory,
} from '../types/game';
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

const SEEDED_MARATHON_ZONES = [
  {
    id: 'marathon-zone-1',
    latOffsetMeters: -760,
    lngOffsetMeters: 710,
    radiusMeters: 214,
    distanceKm: 42.2,
    weatherLabel: 'Humid tailwind',
    weatherBonusNote: 'Weather bonuses reward tough-but-runnable conditions.',
  },
  {
    id: 'marathon-zone-2',
    latOffsetMeters: 820,
    lngOffsetMeters: 620,
    radiusMeters: 226,
    distanceKm: 38.5,
    weatherLabel: 'Crosswind showers',
    weatherBonusNote: 'Rain control and footing add weather bonus points.',
  },
  {
    id: 'marathon-zone-3',
    latOffsetMeters: 920,
    lngOffsetMeters: -760,
    radiusMeters: 232,
    distanceKm: 44.1,
    weatherLabel: 'Heat-index surge',
    weatherBonusNote: 'Heat tolerance boosts the final weather score.',
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

function createMarathonLeaderboard(
  zoneId: string,
  currentUser?: { id: string; name: string },
): MarathonLeaderboardEntry[] {
  const rawEntries = [
    {
      userId: 'runner-nova',
      username: 'Nova',
      baseCompletionScore: 1200,
      speedBonus: 240,
      timeBonus: 180,
      weatherBonus: 90,
      averageSpeed: 13.8,
      finishTimeHours: 18,
    },
    {
      userId: 'runner-blaze',
      username: 'Blaze',
      baseCompletionScore: 1200,
      speedBonus: 210,
      timeBonus: 160,
      weatherBonus: 85,
      averageSpeed: 13.2,
      finishTimeHours: 22,
    },
    {
      userId: 'runner-rune',
      username: 'Rune',
      baseCompletionScore: 1200,
      speedBonus: 195,
      timeBonus: 140,
      weatherBonus: 70,
      averageSpeed: 12.8,
      finishTimeHours: 26,
    },
    {
      userId: currentUser?.id ?? 'runner-astra',
      username: currentUser?.name ?? 'Astra',
      baseCompletionScore: 1200,
      speedBonus: 188,
      timeBonus: 132,
      weatherBonus: 68,
      averageSpeed: 12.5,
      finishTimeHours: 29,
    },
    {
      userId: 'runner-vex',
      username: 'Vex',
      baseCompletionScore: 1200,
      speedBonus: 172,
      timeBonus: 120,
      weatherBonus: 64,
      averageSpeed: 12.1,
      finishTimeHours: 31,
    },
    {
      userId: 'runner-orbit',
      username: 'Orbit',
      baseCompletionScore: 1200,
      speedBonus: 166,
      timeBonus: 116,
      weatherBonus: 60,
      averageSpeed: 11.9,
      finishTimeHours: 35,
    },
    {
      userId: 'runner-kite',
      username: 'Kite',
      baseCompletionScore: 1200,
      speedBonus: 158,
      timeBonus: 108,
      weatherBonus: 58,
      averageSpeed: 11.6,
      finishTimeHours: 40,
    },
    {
      userId: 'runner-echo',
      username: 'Echo',
      baseCompletionScore: 1200,
      speedBonus: 150,
      timeBonus: 100,
      weatherBonus: 55,
      averageSpeed: 11.4,
      finishTimeHours: 43,
    },
    {
      userId: 'runner-mako',
      username: 'Mako',
      baseCompletionScore: 1200,
      speedBonus: 144,
      timeBonus: 96,
      weatherBonus: 52,
      averageSpeed: 11.2,
      finishTimeHours: 48,
    },
    {
      userId: 'runner-rook',
      username: 'Rook',
      baseCompletionScore: 1200,
      speedBonus: 136,
      timeBonus: 90,
      weatherBonus: 50,
      averageSpeed: 10.9,
      finishTimeHours: 54,
    },
  ].map(entry => ({
    ...entry,
    speedBonus: entry.speedBonus + (hashValue(`${zoneId}:${entry.userId}`) % 18),
    timeBonus: entry.timeBonus + (hashValue(`${entry.userId}:${zoneId}`) % 14),
    weatherBonus: entry.weatherBonus + (hashValue(`${zoneId}:weather:${entry.userId}`) % 10),
  }));

  return rawEntries
    .map(entry => ({
      ...entry,
      totalScore:
        entry.baseCompletionScore +
        entry.speedBonus +
        entry.timeBonus +
        entry.weatherBonus,
    }))
    .sort((left, right) => right.totalScore - left.totalScore)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
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

export function getMockMarathonTerritories(
  centerLat: number = DEFAULT_MUMBAI_LAT,
  centerLng: number = DEFAULT_MUMBAI_LNG,
  currentUser?: { id: string; name: string },
): MarathonTerritory[] {
  const now = Date.now();
  const start = new Date(now - 2 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  return SEEDED_MARATHON_ZONES.map(zone => {
    const zoneCenterLat = centerLat + metersToLat(zone.latOffsetMeters);
    const zoneCenterLng = centerLng + metersToLng(zone.lngOffsetMeters, centerLat);

    return {
      id: zone.id,
      name: `Marathon ${zone.id.slice(-1)}`,
      boundary: createBlobBoundary(
        zoneCenterLat,
        zoneCenterLng,
        zone.radiusMeters,
        now,
        zone.id,
      ),
      area: approximateBlobAreaKm2(zone.radiusMeters),
      distanceKm: zone.distanceKm,
      activityType: 'Marathon',
      durationDays: 7,
      startsAt: start,
      endsAt: end,
      baseCompletionScore: 1200,
      weatherLabel: zone.weatherLabel,
      weatherBonusNote: zone.weatherBonusNote,
      leaderboard: createMarathonLeaderboard(zone.id, currentUser),
    };
  });
}
