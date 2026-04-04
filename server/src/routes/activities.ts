import { Router } from 'express';
import { getActivities } from '../store';

export const activitiesRouter = Router();

// GET /api/activities?limit=50 — recent activity feed
activitiesRouter.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  res.json(getActivities(limit));
});
