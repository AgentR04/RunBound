import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { io } from '../index';
import { addActivity, addRun, addTerritory, getAllTerritories, getUser } from '../store';
import { Activity, Territory } from '../types';

export const territoriesRouter = Router();

// GET /api/territories — return all claimed territories
territoriesRouter.get('/', (_req, res) => {
  res.json(getAllTerritories());
});

// POST /api/territories — claim a new territory
territoriesRouter.post('/', (req, res) => {
  const body = req.body as Territory & { run?: { id: string; distance: number; duration: number; averagePace: string; averageSpeed: number; calories: number; path: any[] } };

  if (!body.id || !body.ownerId || !Array.isArray(body.boundary)) {
    res.status(400).json({ error: 'Missing required fields: id, ownerId, boundary' });
    return;
  }

  const territory: Territory = {
    id: body.id,
    ownerId: body.ownerId,
    ownerName: body.ownerName || 'Unknown',
    ownerColor: body.ownerColor || '#52FF30',
    boundary: body.boundary,
    area: body.area || 0,
    claimedAt: body.claimedAt || new Date().toISOString(),
    lastDefended: body.lastDefended || null,
    strength: body.strength ?? 100,
    isUnderChallenge: false,
    runId: body.runId || uuidv4(),
  };

  addTerritory(territory);

  // Persist the associated run if provided
  if (body.run) {
    addRun({
      id: body.run.id,
      userId: territory.ownerId,
      startTime: territory.claimedAt,
      endTime: new Date().toISOString(),
      path: body.run.path || [],
      distance: body.run.distance || 0,
      duration: body.run.duration || 0,
      averagePace: body.run.averagePace || "0'00\"",
      averageSpeed: body.run.averageSpeed || 0,
      isLoop: true,
      territoryClaimed: territory.id,
      territoriesChallenged: [],
      calories: body.run.calories || 0,
    });
  }

  // Build activity feed entry
  const owner = getUser(territory.ownerId);
  const centroid = computeCentroid(territory.boundary);
  const areaM2 = Math.round(territory.area * 1_000_000);

  const activity: Activity = {
    id: uuidv4(),
    type: 'territory_claimed',
    userId: territory.ownerId,
    username: owner?.username || territory.ownerName,
    userColor: territory.ownerColor,
    timestamp: new Date().toISOString(),
    message: `${owner?.username || territory.ownerName} claimed ${areaM2.toLocaleString()}m² of territory`,
    data: {
      territoryId: territory.id,
      area: territory.area,
      distance: body.run?.distance,
      duration: body.run?.duration,
      centroid,
    },
  };

  addActivity(activity);

  // Broadcast to all connected clients
  io.emit('territory:new', territory);
  io.emit('activity:new', activity);

  res.status(201).json(territory);
});

function computeCentroid(boundary: Territory['boundary']): { latitude: number; longitude: number } {
  if (!boundary.length) return { latitude: 0, longitude: 0 };
  const lat = boundary.reduce((s, p) => s + p.latitude, 0) / boundary.length;
  const lng = boundary.reduce((s, p) => s + p.longitude, 0) / boundary.length;
  return { latitude: lat, longitude: lng };
}
