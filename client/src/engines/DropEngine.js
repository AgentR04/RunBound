import { calculateDistance } from '../../utils/gpsTracking';

const DROP_SPAWN_INTERVAL_METERS = 200;
const DROP_COLLECTION_RADIUS_METERS = 30;
const DROP_EXPIRY_MS = 2 * 60 * 1000;
const COLLECTION_ANIMATION_MS = 900;
const CAPTURE_MULTIPLIER_DURATION_MS = 10 * 60 * 1000;
const GHOST_MODE_DURATION_MS = 5 * 60 * 1000;
export const SHIELD_DURATION_MS = 24 * 60 * 60 * 1000;

const DROP_TYPES = [
  { type: 'coin', weight: 0.6 },
  { type: 'capture_multiplier', weight: 0.2 },
  { type: 'shield', weight: 0.15 },
  { type: 'ghost_mode', weight: 0.05 },
];

function randomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getDropLabel(type) {
  switch (type) {
    case 'coin':
      return 'Coin Drop';
    case 'capture_multiplier':
      return 'Capture Multiplier';
    case 'shield':
      return 'Shield Pickup';
    case 'ghost_mode':
      return 'Ghost Mode';
    default:
      return 'Reward';
  }
}

function buildRewardText(type, value) {
  switch (type) {
    case 'coin':
      return `+${value} Coins`;
    case 'capture_multiplier':
      return '⚡ XP x2';
    case 'shield':
      return '+1 Shield';
    case 'ghost_mode':
      return '👻 Ghost Mode';
    default:
      return '+Reward';
  }
}

function createDrop(type, location, now) {
  const value = type === 'coin' ? randomIntInclusive(20, 150) : 1;

  return {
    id: `drop-${type}-${now}-${Math.round(Math.random() * 1_000_000)}`,
    type,
    coordinate: {
      latitude: location.latitude,
      longitude: location.longitude,
    },
    value,
    rewardText: buildRewardText(type, value),
    spawnedAt: now,
    expiresAt: now + DROP_EXPIRY_MS,
    status: 'active',
    collectedAt: null,
  };
}

function rollDropType() {
  const roll = Math.random();
  let cumulative = 0;

  for (const entry of DROP_TYPES) {
    cumulative += entry.weight;
    if (roll <= cumulative) {
      return entry.type;
    }
  }

  return 'coin';
}

function getRewardDelta(drop, now) {
  if (drop.type === 'coin') {
    return { coinsDelta: drop.value, shieldDelta: 0, shieldExpiresAt: undefined };
  }

  if (drop.type === 'shield') {
    return {
      coinsDelta: 0,
      shieldDelta: 1,
      shieldExpiresAt: now + SHIELD_DURATION_MS,
    };
  }

  return { coinsDelta: 0, shieldDelta: 0, shieldExpiresAt: undefined };
}

function cleanupDrops(drops, now) {
  return drops.filter(drop => {
    if (drop.status === 'collecting' && drop.collectedAt) {
      return now - drop.collectedAt < COLLECTION_ANIMATION_MS;
    }

    return drop.status === 'active' ? drop.expiresAt > now : true;
  });
}

/**
 * Ensure an active run always contains the path reward state required by the
 * drop engine. This keeps new modules compatible with older saved run objects.
 */
export function hydratePathRewardState(activeRun) {
  return {
    ...activeRun,
    drops: activeRun.drops ?? [],
    collectedDrops: activeRun.collectedDrops ?? [],
    dropsCollected: activeRun.dropsCollected ?? 0,
    coinsCollected: activeRun.coinsCollected ?? 0,
    shieldChargesEarned: activeRun.shieldChargesEarned ?? 0,
    captureMultiplier: activeRun.captureMultiplier ?? 1,
    multiplierExpiresAt: activeRun.multiplierExpiresAt ?? null,
    ghostUntil: activeRun.ghostUntil ?? null,
    dropProgressMeters: activeRun.dropProgressMeters ?? 0,
  };
}

/**
 * Build the initial active run object, including all path reward fields, so
 * screens can start a run without duplicating default reward state.
 */
export function createActiveRunState(startLocation, startedAt = new Date()) {
  return hydratePathRewardState({
    state: 'running',
    startTime: startedAt,
    path: startLocation ? [startLocation] : [],
    distance: 0,
    duration: 0,
    pausedDuration: 0,
    isNearStart: false,
  });
}

/**
 * Advance path rewards after a new GPS point is accepted. The engine handles:
 * 1. 200m spawn rolls
 * 2. 30m proximity collection
 * 3. Immediate reward state updates for coins, shields, multiplier, and ghost mode
 */
export function advancePathRewards(activeRun, previousLocation, currentLocation, now = Date.now()) {
  const hydratedRun = hydratePathRewardState(activeRun);
  const nextDrops = cleanupDrops(hydratedRun.drops, now).slice();
  const events = [];
  let dropProgressMeters = hydratedRun.dropProgressMeters;

  if (previousLocation) {
    dropProgressMeters +=
      calculateDistance(previousLocation, currentLocation) * 1000;
  }

  while (dropProgressMeters >= DROP_SPAWN_INTERVAL_METERS) {
    const spawnedDrop = createDrop(rollDropType(), currentLocation, now);
    nextDrops.push(spawnedDrop);
    events.push({ type: 'spawned', drop: spawnedDrop });
    dropProgressMeters -= DROP_SPAWN_INTERVAL_METERS;
  }

  let coinsCollected = hydratedRun.coinsCollected;
  let shieldChargesEarned = hydratedRun.shieldChargesEarned;
  let captureMultiplier = hydratedRun.captureMultiplier;
  let multiplierExpiresAt = hydratedRun.multiplierExpiresAt;
  let ghostUntil = hydratedRun.ghostUntil;
  const collectedDrops = hydratedRun.collectedDrops.slice();

  const updatedDrops = nextDrops.map(drop => {
    if (drop.status !== 'active') {
      return drop;
    }

    const distanceToDropMeters =
      calculateDistance(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          timestamp: currentLocation.timestamp,
        },
        {
          latitude: drop.coordinate.latitude,
          longitude: drop.coordinate.longitude,
          timestamp: currentLocation.timestamp,
        },
      ) * 1000;

    if (distanceToDropMeters > DROP_COLLECTION_RADIUS_METERS) {
      return drop;
    }

    const collectedDrop = {
      id: drop.id,
      type: drop.type,
      label: getDropLabel(drop.type),
      value: drop.value,
      rewardText: drop.rewardText,
      collectedAt: now,
    };

    collectedDrops.push(collectedDrop);
    events.push({
      type: 'collected',
      drop: {
        ...drop,
        status: 'collecting',
        collectedAt: now,
      },
      collectedDrop,
      rewardDelta: getRewardDelta(drop, now),
    });

    if (drop.type === 'coin') {
      coinsCollected += drop.value;
    }

    if (drop.type === 'shield') {
      shieldChargesEarned += 1;
    }

    if (drop.type === 'capture_multiplier') {
      captureMultiplier = 2;
      multiplierExpiresAt = now + CAPTURE_MULTIPLIER_DURATION_MS;
    }

    if (drop.type === 'ghost_mode') {
      ghostUntil = now + GHOST_MODE_DURATION_MS;
    }

    return {
      ...drop,
      status: 'collecting',
      collectedAt: now,
    };
  });

  return {
    run: {
      ...hydratedRun,
      drops: updatedDrops,
      collectedDrops,
      dropsCollected: collectedDrops.length,
      coinsCollected,
      shieldChargesEarned,
      captureMultiplier,
      multiplierExpiresAt,
      ghostUntil,
      dropProgressMeters,
    },
    events,
  };
}

/**
 * Reconcile timed reward state once per second while a run is active. This
 * prunes expired drops, removes completed pickup animations, and turns off
 * temporary boosts when their countdown reaches zero.
 */
export function syncTimedPathRewardState(activeRun, now = Date.now()) {
  const hydratedRun = hydratePathRewardState(activeRun);
  const events = [];
  const nextRun = {
    ...hydratedRun,
    drops: cleanupDrops(hydratedRun.drops, now),
  };

  if (
    hydratedRun.multiplierExpiresAt &&
    hydratedRun.multiplierExpiresAt <= now &&
    hydratedRun.captureMultiplier > 1
  ) {
    nextRun.captureMultiplier = 1;
    nextRun.multiplierExpiresAt = null;
    events.push({ type: 'multiplier_expired' });
  }

  if (hydratedRun.ghostUntil && hydratedRun.ghostUntil <= now) {
    nextRun.ghostUntil = null;
    events.push({ type: 'ghost_expired' });
  }

  return { run: nextRun, events };
}

/**
 * Convert the current run reward state into a compact HUD snapshot so the UI
 * can display counters and countdowns without duplicating reward logic.
 */
export function getPathRewardHudState(activeRun, now = Date.now()) {
  const hydratedRun = hydratePathRewardState(activeRun);
  const multiplierRemainingMs = hydratedRun.multiplierExpiresAt
    ? Math.max(0, hydratedRun.multiplierExpiresAt - now)
    : 0;
  const ghostRemainingMs = hydratedRun.ghostUntil
    ? Math.max(0, hydratedRun.ghostUntil - now)
    : 0;

  return {
    dropsCollected: hydratedRun.dropsCollected,
    coinsCollected: hydratedRun.coinsCollected,
    multiplierValue:
      multiplierRemainingMs > 0 && hydratedRun.captureMultiplier > 1
        ? hydratedRun.captureMultiplier
        : null,
    multiplierRemainingMs,
    ghostRemainingMs,
    ghostActive: ghostRemainingMs > 0,
  };
}
