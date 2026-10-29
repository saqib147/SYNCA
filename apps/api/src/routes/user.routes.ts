import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getTeammates, getUserProfile } from '../controllers/user.controller.js';

const router = Router();

router.use(requireAuth);

// GET /api/v1/users/teammates — enriched list of unique project collaborators
router.get('/teammates', getTeammates);

// GET /api/v1/users/:userId/profile — public profile (name & avatar) for a user
router.get('/:userId/profile', getUserProfile);

export default router;

