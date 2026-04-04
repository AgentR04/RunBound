// Temporary in-memory storage to replace AsyncStorage
import { Run, Territory, User } from '../types/game';

// In-memory storage
let runs: Run[] = [];
let territories: Territory[] = [];
let user: User | null = null;

const STORAGE_KEYS = {
  RUNS: 'runbound_runs',
  TERRITORIES: 'runbound_territories',
  USER: 'runbound_user',
};

/**
 * Save a completed run to local storage
 */
export async function saveRun(run: Run): Promise<boolean> {
  try {
    runs.push(run);
    console.log(`Saved run ${run.id}, total runs: ${runs.length}`);
    return true;
  } catch (error) {
    console.error('Error saving run:', error);
    return false;
  }
}

/**
 * Get all saved runs from storage
 */
export async function getRuns(): Promise<Run[]> {
  try {
    return runs.map(run => ({
      ...run,
      startTime: new Date(run.startTime),
      endTime: run.endTime ? new Date(run.endTime) : null,
    }));
  } catch (error) {
    console.error('Error loading runs:', error);
    return [];
  }
}

/**
 * Save a territory to local storage
 */
export async function saveTerritory(territory: Territory): Promise<boolean> {
  try {
    territories.push(territory);
    console.log(`Saved territory ${territory.id}, total territories: ${territories.length}`);
    return true;
  } catch (error) {
    console.error('Error saving territory:', error);
    return false;
  }
}

/**
 * Get all saved territories from storage
 */
export async function getTerritories(): Promise<Territory[]> {
  try {
    return territories.map(territory => ({
      ...territory,
      claimedAt: new Date(territory.claimedAt),
      lastDefended: territory.lastDefended ? new Date(territory.lastDefended) : null,
    }));
  } catch (error) {
    console.error('Error loading territories:', error);
    return [];
  }
}

/**
 * Update user profile in storage
 */
export async function saveUser(userData: User): Promise<boolean> {
  try {
    user = userData;
    console.log(`Saved user ${userData.username}`);
    return true;
  } catch (error) {
    console.error('Error saving user:', error);
    return false;
  }
}

/**
 * Get user profile from storage
 */
export async function getUser(): Promise<User | null> {
  try {
    if (!user) return null;

    return {
      ...user,
      createdAt: new Date(user.createdAt),
    };
  } catch (error) {
    console.error('Error loading user:', error);
    return null;
  }
}

/**
 * Update user stats after a run or territory claim
 */
export async function updateUserStats(
  distanceRun?: number,
  newTerritoryArea?: number
): Promise<void> {
  try {
    const currentUser = await getUser();
    if (!currentUser) return;

    const updatedUser: User = {
      ...currentUser,
      totalRuns: currentUser.totalRuns + (distanceRun ? 1 : 0),
      totalDistance: currentUser.totalDistance + (distanceRun || 0),
      totalArea: currentUser.totalArea + (newTerritoryArea || 0),
    };

    await saveUser(updatedUser);
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}

/**
 * Clear all stored data (for testing/development)
 */
export async function clearAllData(): Promise<void> {
  try {
    runs = [];
    territories = [];
    user = null;
    console.log('Cleared all data');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

/**
 * Get storage info for debugging
 */
export async function getStorageInfo(): Promise<{
  runs: number;
  territories: number;
  hasUser: boolean;
}> {
  try {
    const currentRuns = await getRuns();
    const currentTerritories = await getTerritories();
    const currentUser = await getUser();

    return {
      runs: currentRuns.length,
      territories: currentTerritories.length,
      hasUser: !!currentUser,
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { runs: 0, territories: 0, hasUser: false };
  }
}