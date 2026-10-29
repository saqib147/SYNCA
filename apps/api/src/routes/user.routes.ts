import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getTeammates } from '../controllers/user.controller.js';

const router = Router();

router.use(requireAuth);

// GET /api/v1/users/teammates — enriched list of unique project collaborators
router.get('/teammates', getTeammates);

export default router;

