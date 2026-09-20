import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getAuth, clerkClient } from '@clerk/express';
import { createTaskSchema, updateTaskSchema, moveTaskSchema } from '@synca/zod-schemas';
import { Task } from '../models/Task.js';
import { Project } from '../models/Project.js';
import { Workspace } from '../models/Workspace.js';

const getUserId = (req: Request): string | undefined => {
  try {
    return (req as any).auth?.userId || getAuth(req)?.userId;
  } catch {
    return (req as any).auth?.userId;
  }
};

/**
 * POST /api/v1/tasks
 * Create a new task within a project or a personal private task.
 */
export async function createTask(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const parseResult = createTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid task payload',
          details: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    const {
      workspaceId,
      projectId,
      title,
      description,
      status,
      priority,
      assignees,
      dueDate,
      subtasks,
      isPrivate,
    } = parseResult.data;

    let targetWorkspaceId = workspaceId;

    // If projectId is supplied, derive workspaceId from project
    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      const project = await Project.findById(projectId).lean();
      if (!project) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }
      targetWorkspaceId = project.workspaceId.toString();
    }

    if (!targetWorkspaceId || !mongoose.Types.ObjectId.isValid(targetWorkspaceId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid workspaceId is required' },
      });
    }

    // Verify caller belongs to the workspace
    const workspace = await Workspace.findById(targetWorkspaceId).lean();
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    const callerMember = workspace.members.find((m) => m.userId === userId);
    if (!callerMember) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You must be a member of this workspace to create tasks' },
      });
    }

    const isPrivileged = callerMember.role === 'owner' || callerMember.role === 'admin' || workspace.ownerId === userId;

    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      const project = await Project.findById(projectId).lean();
      if (project) {
        const isTeamMember = project.teamMembers?.includes(userId);
        if (!isTeamMember && !isPrivileged) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Only project team members or workspace admins can create tasks for this project' },
          });
        }
      }
    }

    // Determine highest order for this column so the new task goes to the end
    const lastTask = await Task.findOne({
      workspaceId: targetWorkspaceId,
      projectId: projectId || null,
      status: status || 'To Do',
      deletedAt: null,
    })
      .sort({ order: -1 })
      .lean();

    const nextOrder = lastTask ? (lastTask.order || 0) + 1 : 0;

    const newTask = await Task.create({
      workspaceId: targetWorkspaceId,
      projectId: projectId || null,
      createdBy: userId,
      title,
      description: description || '',
      status: status || 'To Do',
      order: nextOrder,
      priority: priority || 'Medium',
      assignees: assignees && assignees.length > 0 ? assignees : [userId],
      dueDate: dueDate ? new Date(dueDate) : null,
      subtasks: subtasks || [],
      isPrivate: Boolean(isPrivate),
    });

    return res.status(201).json({
      success: true,
      data: newTask,
    });
  } catch (error: any) {
    console.error('[TaskController] createTask error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create task' },
    });
  }
}

/**
 * GET /api/v1/tasks
 * Retrieve tasks for a specific project.
 */
export async function getProjectTasks(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const { projectId, status, priority } = req.query;
    if (!projectId || typeof projectId !== 'string' || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid projectId query parameter required' },
      });
    }

    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Verify workspace membership and project privacy
    const workspace = await Workspace.findById(project.workspaceId).lean();
    const callerMember = workspace?.members.find((m) => m.userId === userId);
    if (!callerMember) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied to project tasks' },
      });
    }

    const isPrivileged = callerMember.role === 'owner' || callerMember.role === 'admin' || workspace?.ownerId === userId;
    const isTeamMember = project.teamMembers?.includes(userId);

    if (!isTeamMember && !isPrivileged) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only assigned project team members or workspace admins can view project tasks' },
      });
    }

    const query: any = {
      projectId,
      deletedAt: null,
    };

    if (status && typeof status === 'string') {
      query.status = status;
    }
    if (priority && typeof priority === 'string') {
      query.priority = priority;
    }

    const tasks = await Task.find(query).sort({ order: 1, createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error: any) {
    console.error('[TaskController] getProjectTasks error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve tasks' },
    });
  }
}

/**
 * GET /api/v1/tasks/my-tasks
 * Retrieve caller's assigned tasks and private tasks across a workspace.
 */
export async function getMyTasks(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const { workspaceId, filter } = req.query;
    const query: any = {
      deletedAt: null,
      $or: [
        { assignees: userId },
        { createdBy: userId, isPrivate: true },
      ],
    };

    if (workspaceId && typeof workspaceId === 'string' && mongoose.Types.ObjectId.isValid(workspaceId)) {
      query.workspaceId = workspaceId;

      // Self-healing: Cascade soft-delete any tasks belonging to deleted projects in this workspace
      const deletedProjects = await Project.find({ workspaceId, deletedAt: { $ne: null } }).select('_id').lean();
      if (deletedProjects.length > 0) {
        const deletedProjectIds = deletedProjects.map((p) => p._id);
        await Task.updateMany(
          { projectId: { $in: deletedProjectIds }, deletedAt: null },
          { deletedAt: new Date() }
        );
      }

      // Strictly filter to active projects or personal tasks
      const activeProjects = await Project.find({ workspaceId, deletedAt: null }).select('_id').lean();
      const activeProjectIds = activeProjects.map((p) => p._id);
      query.projectId = { $in: [...activeProjectIds, null] };
    }

    if (filter === 'upcoming') {
      query.status = { $ne: 'Done' };
      query.dueDate = { $gte: new Date() };
    } else if (filter === 'overdue') {
      query.status = { $ne: 'Done' };
      query.dueDate = { $lt: new Date() };
    } else if (filter === 'completed') {
      query.status = 'Done';
    }

    const tasks = await Task.find(query).sort({ dueDate: 1, updatedAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error: any) {
    console.error('[TaskController] getMyTasks error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve personal tasks' },
    });
  }
}

/**
 * PATCH /api/v1/tasks/:id
 * Update task metadata, status, priority, subtasks, or assignees.
 */
export async function updateTask(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid task ID required' },
      });
    }

    const parseResult = updateTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid task update payload',
          details: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    const task = await Task.findOne({ _id: id, deletedAt: null });
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    // Verify workspace membership and project team membership
    const workspace = await Workspace.findById(task.workspaceId).lean();
    const callerMember = workspace?.members.find((m) => m.userId === userId);
    if (!callerMember) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Permission denied to edit this task' },
      });
    }

    const isPrivileged = callerMember.role === 'owner' || callerMember.role === 'admin' || workspace?.ownerId === userId;
    if (task.projectId) {
      const project = await Project.findById(task.projectId).lean();
      if (project) {
        const isTeamMember = project.teamMembers?.includes(userId);
        if (!isTeamMember && !isPrivileged) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Only project team members or workspace admins can edit tasks for this project' },
          });
        }
      }
    }

    const updates = parseResult.data;
    if (updates.title) task.title = updates.title.trim();
    if (updates.description !== undefined) task.description = updates.description.trim();
    if (updates.status) task.status = updates.status;
    if (updates.priority) task.priority = updates.priority;
    if (updates.assignees) task.assignees = updates.assignees;
    if (updates.dueDate !== undefined) task.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    if (updates.subtasks) task.subtasks = updates.subtasks as any;
    if (updates.isPrivate !== undefined) task.isPrivate = updates.isPrivate;

    await task.save();

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    console.error('[TaskController] updateTask error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update task' },
    });
  }
}

/**
 * PATCH /api/v1/tasks/:id/move
 * Update Kanban column status and order index.
 */
export async function moveTask(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid task ID required' },
      });
    }

    const parseResult = moveTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid move payload',
          details: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    const { newStatus, newOrder } = parseResult.data;

    const task = await Task.findOne({ _id: id, deletedAt: null });
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    // Verify workspace membership and project team membership
    const workspace = await Workspace.findById(task.workspaceId).lean();
    const callerMember = workspace?.members.find((m) => m.userId === userId);
    if (!callerMember) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Permission denied to move this task' },
      });
    }

    const isPrivileged = callerMember.role === 'owner' || callerMember.role === 'admin' || workspace?.ownerId === userId;
    if (task.projectId) {
      const project = await Project.findById(task.projectId).lean();
      if (project) {
        const isTeamMember = project.teamMembers?.includes(userId);
        if (!isTeamMember && !isPrivileged) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Only project team members or workspace admins can move tasks for this project' },
          });
        }
      }
    }

    task.status = newStatus;
    task.order = newOrder;
    await task.save();

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    console.error('[TaskController] moveTask error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to move task' },
    });
  }
}

/**
 * DELETE /api/v1/tasks/:id
 * Soft delete a task.
 */
export async function deleteTask(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid task ID required' },
      });
    }

    const task = await Task.findOne({ _id: id, deletedAt: null });
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    // Verify permission (creator, assignee, or workspace admin)
    const workspace = await Workspace.findById(task.workspaceId).lean();
    const callerMember = workspace?.members.find((m) => m.userId === userId);
    const isPrivileged = callerMember?.role === 'owner' || callerMember?.role === 'admin' || task.createdBy === userId;

    if (!isPrivileged) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Permission denied to delete task' },
      });
    }

    task.deletedAt = new Date();
    await task.save();

    return res.status(200).json({
      success: true,
      data: { id: task._id, message: 'Task deleted successfully' },
    });
  } catch (error: any) {
    console.error('[TaskController] deleteTask error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete task' },
    });
  }
}
