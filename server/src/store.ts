import { Activity, Run, Territory, User } from './types';

// In-memory store — replace with a real DB later

const territories: Territory[] = [];
const runs: Run[] = [];
const activities: Activity[] = [];
const users: Map<string, User> = new Map();

// Seed a default user so the app works without auth
const defaultUser: User = {
  id: 'user-1',
  username: 'Runner',
  color: '#52FF30',
  territories: [],
  totalArea: 0,
  totalRuns: 0,
  totalDistance: 0,
  createdAt: new Date().toISOString(),
};
users.set(defaultUser.id, defaultUser);

// ── Territories ──────────────────────────────────────────────

export function getAllTerritories(): Territory[] {
  return territories;
}

export function getTerritoryById(id: string): Territory | undefined {
  return territories.find(t => t.id === id);
}

export function addTerritory(territory: Territory): Territory {
  territories.push(territory);

  // Update owner's territory list
  const owner = users.get(territory.ownerId);
  if (owner) {
    owner.territories.push(territory.id);
    owner.totalArea = parseFloat((owner.totalArea + territory.area).toFixed(6));
  }

  return territory;
}

// ── Runs ─────────────────────────────────────────────────────

export function getAllRuns(): Run[] {
  return runs;
}

export function addRun(run: Run): Run {
  runs.push(run);

  const owner = users.get(run.userId);
  if (owner) {
    owner.totalRuns += 1;
    owner.totalDistance = parseFloat((owner.totalDistance + run.distance).toFixed(3));
  }

  return run;
}

// ── Users ─────────────────────────────────────────────────────

export function getUser(id: string): User | undefined {
  return users.get(id);
}

export function upsertUser(user: User): User {
  users.set(user.id, user);
  return user;
}

export function getAllUsers(): User[] {
  return Array.from(users.values());
}

// ── Activities ────────────────────────────────────────────────

export function getActivities(limit = 50): Activity[] {
  return activities.slice(-limit).reverse();
}

export function addActivity(activity: Activity): Activity {
  activities.push(activity);
  // Cap to last 500 activities in memory
  if (activities.length > 500) {
    activities.splice(0, activities.length - 500);
  }
  return activity;
}
