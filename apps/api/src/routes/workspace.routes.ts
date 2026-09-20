import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  joinWorkspace,
  updateWorkspace,
  removeMember,
  deleteWorkspace,
} from '../controllers/workspace.controller.js';

const router = Router();

// Apply auth middleware to all workspace endpoints
router.use(requireAuth);

// Collection routes
router.post('/', createWorkspace);
router.get('/', getUserWorkspaces);
router.post('/join', joinWorkspace);

// Document routes
router.get('/:id', getWorkspaceById);
router.patch('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);

// Member management routes
router.delete('/:id/members/:userId', removeMember);

export default router;
