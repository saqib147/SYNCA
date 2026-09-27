import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  createProject,
  joinProject,
  getUserProjects,
  getProjectById,
  updateProject,
  updateMemberRole,
  removeMember,
  regenerateJoinCode,
  deleteProject,
} from '../controllers/project.controller.js';

const router = Router();

// Protect all project routes
router.use(requireAuth);

router.post('/', createProject);
router.post('/join', joinProject);
router.get('/', getUserProjects);
router.get('/:id', getProjectById);
router.patch('/:id', updateProject);
router.patch('/:id/members/:targetUserId/role', updateMemberRole);
router.delete('/:id/members/:targetUserId', removeMember);
router.post('/:id/join-code/reset', regenerateJoinCode);
router.delete('/:id', deleteProject);

export default router;
