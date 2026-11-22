import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rate-limit.middleware.js';
import { getTeammates, getUserProfile, lookupUserByEmail } from '../controllers/user.controller.js';

const router = Router();

router.use(requireAuth);

const lookupLimiter = createRateLimiter({ windowSeconds: 60, maxRequests: 15, keyPrefix: 'user-lookup' });
const profileLimiter = createRateLimiter({ windowSeconds: 60, maxRequests: 60, keyPrefix: 'user-profile' });

// GET /api/v1/users/teammates — enriched list of unique project collaborators
router.get('/teammates', getTeammates);

// GET /api/v1/users/lookup?email=... — exact email lookup for Tier 3 DM discovery
router.get('/lookup', lookupLimiter, lookupUserByEmail);

// GET /api/v1/users/:userId/profile — scoped public profile (name & avatar)
router.get('/:userId/profile', profileLimiter, getUserProfile);

export default router;
