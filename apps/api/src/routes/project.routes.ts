import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rate-limit.middleware.js';
import {
  createProject,
  joinProject,
  getUserProjects,
  getProjectById,
  updateProject,
  addProjectMember,
  updateMemberRole,
  removeMember,
  regenerateJoinCode,
  deleteProject,
} from '../controllers/project.controller.js';

const router = Router();
const joinLimiter = createRateLimiter({ windowSeconds: 60, maxRequests: 10, keyPrefix: 'project-join' });
const addMemberLimiter = createRateLimiter({ windowSeconds: 60, maxRequests: 20, keyPrefix: 'project-add-member' });

// Protect all project routes
router.use(requireAuth);

router.post('/', createProject);
router.post('/join', joinLimiter, joinProject);
router.get('/', getUserProjects);
router.get('/:id', getProjectById);
router.patch('/:id', updateProject);
router.post('/:id/members', addMemberLimiter, addProjectMember);
router.patch('/:id/members/:targetUserId/role', updateMemberRole);
router.delete('/:id/members/:targetUserId', removeMember);
router.post('/:id/join-code/reset', regenerateJoinCode);
router.delete('/:id', deleteProject);

export default router;
