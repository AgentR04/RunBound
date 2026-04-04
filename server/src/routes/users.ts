import { Router } from 'express';
import { getAllUsers, getUser, upsertUser } from '../store';
import { User } from '../types';

export const usersRouter = Router();

// GET /api/users — list all users (leaderboard use)
usersRouter.get('/', (_req, res) => {
  const users = getAllUsers().map(u => ({
    id: u.id,
    username: u.username,
    color: u.color,
    totalRuns: u.totalRuns,
    totalDistance: u.totalDistance,
    totalArea: u.totalArea,
    territoriesOwned: u.territories.length,
  }));
  res.json(users);
});

// GET /api/users/:id — get single user profile
usersRouter.get('/:id', (req, res) => {
  const user = getUser(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

// POST /api/users — create or update a user
usersRouter.post('/', (req, res) => {
  const body = req.body as Partial<User> & { id: string; username: string };
  if (!body.id || !body.username) {
    res.status(400).json({ error: 'Missing required fields: id, username' });
    return;
  }

  const existing = getUser(body.id);
  const user: User = {
    id: body.id,
    username: body.username,
    color: body.color || existing?.color || '#52FF30',
    territories: existing?.territories || [],
    totalArea: existing?.totalArea || 0,
    totalRuns: existing?.totalRuns || 0,
    totalDistance: existing?.totalDistance || 0,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  upsertUser(user);
  res.status(201).json(user);
});
