import appStorage from '../services/appStorage';
import { MOCK_USER, Run, Territory, User } from '../types/game';

const RUNS_KEY = 'runbound:runs';
const TERRITORIES_KEY = 'runbound:territories';
const USER_KEY = 'runbound:user';

type StoredRun = Omit<Run, 'startTime' | 'endTime'> & {
  startTime: string;
  endTime: string | null;
};

type StoredTerritory = Omit<Territory, 'claimedAt' | 'lastDefended'> & {
  claimedAt: string;
  lastDefended: string | null;
};

type StoredUser = Omit<User, 'createdAt'> & {
  createdAt: string;
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await appStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.error(`Error reading storage key ${key}:`, error);
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await appStorage.setItem(key, JSON.stringify(value));
}

function serializeRun(run: Run): StoredRun {
  return {
    ...run,
    startTime: new Date(run.startTime).toISOString(),
    endTime: run.endTime ? new Date(run.endTime).toISOString() : null,
  };
}

function deserializeRun(run: StoredRun): Run {
  return {
    ...run,
    startTime: new Date(run.startTime),
    endTime: run.endTime ? new Date(run.endTime) : null,
  };
}

function serializeTerritory(territory: Territory): StoredTerritory {
  return {
    ...territory,
    claimedAt: new Date(territory.claimedAt).toISOString(),
    lastDefended: territory.lastDefended
      ? new Date(territory.lastDefended).toISOString()
      : null,
  };
}

function deserializeTerritory(territory: StoredTerritory): Territory {
  return {
    ...territory,
    claimedAt: new Date(territory.claimedAt),
    lastDefended: territory.lastDefended ? new Date(territory.lastDefended) : null,
  };
}

function serializeUser(user: User): StoredUser {
  return {
    ...user,
    createdAt: new Date(user.createdAt).toISOString(),
  };
}

function deserializeUser(user: StoredUser): User {
  return {
    ...user,
    createdAt: new Date(user.createdAt),
  };
}

async function saveRuns(runs: Run[]): Promise<void> {
  await writeJson(
    RUNS_KEY,
    runs.map(run => serializeRun(run)),
  );
}

async function saveTerritories(territories: Territory[]): Promise<void> {
  await writeJson(
    TERRITORIES_KEY,
    territories.map(territory => serializeTerritory(territory)),
  );
}

/**
 * Save a completed run to local storage.
 */
export async function saveRun(run: Run): Promise<boolean> {
  try {
    const runs = await getRuns();
    const existingIndex = runs.findIndex(existing => existing.id === run.id);

    if (existingIndex >= 0) {
      runs[existingIndex] = run;
    } else {
      runs.unshift(run);
    }

    await saveRuns(runs);
    return true;
  } catch (error) {
    console.error('Error saving run:', error);
    return false;
  }
}

/**
 * Get all saved runs from storage.
 */
export async function getRuns(): Promise<Run[]> {
  const storedRuns = await readJson<StoredRun[]>(RUNS_KEY, []);
  return storedRuns.map(run => deserializeRun(run));
}

/**
 * Save a territory to local storage.
 */
export async function saveTerritory(territory: Territory): Promise<boolean> {
  try {
    const territories = await getTerritories();
    const existingIndex = territories.findIndex(existing => existing.id === territory.id);

    if (existingIndex >= 0) {
      territories[existingIndex] = territory;
    } else {
      territories.unshift(territory);
    }

    await saveTerritories(territories);
    return true;
  } catch (error) {
    console.error('Error saving territory:', error);
    return false;
  }
}

/**
 * Get all saved territories from storage.
 */
export async function getTerritories(): Promise<Territory[]> {
  const storedTerritories = await readJson<StoredTerritory[]>(TERRITORIES_KEY, []);
  return storedTerritories.map(territory => deserializeTerritory(territory));
}

/**
 * Update user profile in storage.
 */
export async function saveUser(userData: User): Promise<boolean> {
  try {
    await writeJson(USER_KEY, serializeUser(userData));
    return true;
  } catch (error) {
    console.error('Error saving user:', error);
    return false;
  }
}

/**
 * Get user profile from storage.
 */
export async function getUser(): Promise<User | null> {
  const storedUser = await readJson<StoredUser | null>(USER_KEY, null);
  return storedUser ? deserializeUser(storedUser) : null;
}

/**
 * Ensure there is a local user profile to apply reward updates against.
 */
export async function ensureLocalUserProfile(
  identity: Pick<User, 'id' | 'username'> & Partial<Pick<User, 'color'>>,
): Promise<User> {
  const existing = await getUser();

  if (existing && existing.id === identity.id) {
    return existing;
  }

  const nextUser: User = {
    ...MOCK_USER,
    id: identity.id,
    username: identity.username,
    color: identity.color ?? existing?.color ?? MOCK_USER.color,
    territories: existing?.territories ?? [],
    totalArea: existing?.totalArea ?? 0,
    totalRuns: existing?.totalRuns ?? 0,
    totalDistance: existing?.totalDistance ?? 0,
    friends: existing?.friends ?? [],
    streaks: existing?.streaks ?? MOCK_USER.streaks,
    activeBoosts: existing?.activeBoosts ?? MOCK_USER.activeBoosts,
    coins: existing?.coins ?? 0,
    shieldCharges: existing?.shieldCharges ?? 0,
    shieldActive: Boolean(
      existing?.shieldActive &&
      (!existing.shieldExpiresAt || existing.shieldExpiresAt > Date.now()),
    ),
    shieldExpiresAt:
      existing?.shieldExpiresAt && existing.shieldExpiresAt > Date.now()
        ? existing.shieldExpiresAt
        : null,
    createdAt: existing?.createdAt ?? new Date(),
  };

  await saveUser(nextUser);
  return nextUser;
}

/**
 * Apply reward inventory changes to the local user profile.
 */
export async function updateLocalUserRewards(
  identity: Pick<User, 'id' | 'username'> & Partial<Pick<User, 'color'>>,
  updates: {
    coinsDelta?: number;
    shieldDelta?: number;
    shieldExpiresAt?: number | null;
  },
): Promise<User> {
  const currentUser = await ensureLocalUserProfile(identity);
  const nextShieldExpiresAt =
    updates.shieldExpiresAt !== undefined
      ? updates.shieldExpiresAt
      : currentUser.shieldExpiresAt;

  const updatedUser: User = {
    ...currentUser,
    coins: currentUser.coins + (updates.coinsDelta ?? 0),
    shieldCharges: currentUser.shieldCharges + (updates.shieldDelta ?? 0),
    shieldActive:
      !!nextShieldExpiresAt && nextShieldExpiresAt > Date.now()
        ? true
        : currentUser.shieldActive && !!currentUser.shieldExpiresAt,
    shieldExpiresAt:
      nextShieldExpiresAt && nextShieldExpiresAt > Date.now()
        ? nextShieldExpiresAt
        : null,
  };

  await saveUser(updatedUser);
  return updatedUser;
}

/**
 * Recompute user stats from persisted runs and territories.
 */
export async function updateUserStats(): Promise<void> {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return;
    }

    const [runs, territories] = await Promise.all([getRuns(), getTerritories()]);
    const userRuns = runs.filter(run => run.userId === currentUser.id);
    const ownedTerritories = territories.filter(
      territory => territory.ownerId === currentUser.id,
    );

    const updatedUser: User = {
      ...currentUser,
      territories: ownedTerritories.map(territory => territory.id),
      totalRuns: userRuns.length,
      totalDistance: userRuns.reduce((sum, run) => sum + run.distance, 0),
      totalArea: ownedTerritories.reduce((sum, territory) => sum + territory.area, 0),
    };

    await saveUser(updatedUser);
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}

/**
 * Clear all stored data (for testing/development).
 */
export async function clearAllData(): Promise<void> {
  try {
    await appStorage.multiRemove([RUNS_KEY, TERRITORIES_KEY, USER_KEY]);
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

/**
 * Get storage info for debugging.
 */
export async function getStorageInfo(): Promise<{
  runs: number;
  territories: number;
  hasUser: boolean;
}> {
  try {
    const [runs, territories, user] = await Promise.all([
      getRuns(),
      getTerritories(),
      getUser(),
    ]);

    return {
      runs: runs.length,
      territories: territories.length,
      hasUser: !!user,
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { runs: 0, territories: 0, hasUser: false };
  }
}
