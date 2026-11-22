import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getAuth } from '@clerk/express';
import { createTaskSchema, updateTaskSchema, moveTaskSchema, addCommentSchema } from '@synca/zod-schemas';
import { Task } from '../models/Task.js';
import { Project } from '../models/Project.js';
import { isProjectMember, isProjectAdminOrMod } from '../utils/membership.js';
import { fetchUserProfile } from '../utils/clerk-profile.js';
import { getIO } from '../socket/index.js';

function broadcastTaskUpdate(task: any) {
  if (!task?.projectId) return;
  const io = getIO();
  if (!io) return;
  // Don't broadcast private task details to the whole project room
  if (task.isPrivate) return;
  io.to(`project:${String(task.projectId)}`).emit('task:updated', {
    task,
    projectId: String(task.projectId),
  });
}

const getUserId = (req: Request): string | undefined => {
  try {
    return (req as any).auth?.userId || getAuth(req)?.userId;
  } catch {
    return (req as any).auth?.userId;
  }
};

/**
 * Evaluates task permissions consistently, enforcing:
 * 1. Removed ex-members cannot access project tasks (project must be active & user must still be a member).
 * 2. Private project tasks (`isPrivate: true`) are invisible/inaccessible to regular members who are neither creator nor assignee.
 */
async function resolveTaskPermissions(task: any, userId: string) {
  const isCreator = task.createdBy === userId;
  const isAssignee = Boolean(task.assignees?.includes(userId));

  if (!task.projectId) {
    const canEditFull = isCreator;
    const canCollaborate = isCreator || isAssignee;
    return { canEditFull, canCollaborate };
  }

  const project = await Project.findOne({ _id: task.projectId, deletedAt: null }).lean();
  if (!project || !isProjectMember(project, userId)) {
    return { canEditFull: false, canCollaborate: false };
  }

  const isAdminOrMod = isProjectAdminOrMod(project, userId);
  if (task.isPrivate && !isAdminOrMod && !isCreator && !isAssignee) {
    return { canEditFull: false, canCollaborate: false };
  }

  const canEditFull = isCreator || isAdminOrMod;
  const canCollaborate = true;
  return { canEditFull, canCollaborate };
}

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
      projectId,
      title,
      description,
      status,
      column,
      priority,
      assignees,
      dueDate,
      subtasks,
      isPrivate,
    } = parseResult.data;

    let resolvedColumn = column?.trim() || '';

    if (projectId) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid projectId format' },
        });
      }
      const project = await Project.findOne({ _id: projectId, deletedAt: null }).lean();
      if (!project) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      if (!isProjectMember(project, userId)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You must be a member of this project to create tasks' },
        });
      }

      const existingColumns = Array.isArray(project.columns) ? project.columns : [];
      if (!resolvedColumn) {
        resolvedColumn = existingColumns.length > 0 ? existingColumns[0] : 'Default Column';
      }

      // Auto-register the column on the project if it doesn't exist yet (e.g. "Default Column")
      if (!existingColumns.includes(resolvedColumn)) {
        await Project.updateOne(
          { _id: project._id },
          { $addToSet: { columns: resolvedColumn } }
        );
      }
    }

    // Determine highest order for this column
    const lastTask = await Task.findOne({
      projectId: projectId || null,
      ...(projectId ? { column: resolvedColumn } : { status: status || 'To Do' }),
      deletedAt: null,
    })
      .sort({ order: -1 })
      .lean();

    const nextOrder = lastTask ? (lastTask.order || 0) + 1 : 0;

    const newTask = await Task.create({
      projectId: projectId || null,
      createdBy: userId,
      title,
      description: description || '',
      status: status || 'To Do',
      column: resolvedColumn,
      order: nextOrder,
      priority: priority || 'Medium',
      assignees: assignees && assignees.length > 0 ? assignees : [userId],
      dueDate: dueDate ? new Date(dueDate) : null,
      subtasks: subtasks || [],
      isPrivate: Boolean(isPrivate),
    });

    broadcastTaskUpdate(newTask);

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

    const project = await Project.findOne({ _id: projectId, deletedAt: null }).lean();
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const isMember =
      project.ownerId === userId ||
      (project.members && project.members.some((m) => m.userId === userId)) ||
      project.teamMembers?.includes(userId);

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied to project tasks' },
      });
    }

    const isAdminOrMod = isProjectAdminOrMod(project, userId);

    const query: any = {
      projectId,
      deletedAt: null,
    };

    // For regular members, show all public tasks; hide private tasks unless the user is the creator or an assignee
    if (!isAdminOrMod) {
      query.$or = [
        { isPrivate: { $ne: true } },
        { createdBy: userId },
        { assignees: userId },
      ];
    }

    if (status && typeof status === 'string') {
      query.status = status;
    }

    if (priority && typeof priority === 'string') {
      query.priority = priority;
    }

    const tasks = await Task.find(query).sort({ status: 1, order: 1, createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error: any) {
    console.error('[TaskController] getProjectTasks error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve project tasks' },
    });
  }
}

/**
 * GET /api/v1/tasks/my
 * Get user's assigned/created tasks across all their joined projects (plus personal tasks).
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

    // Find all projects where user is a member or owner
    const userProjects = await Project.find({
      deletedAt: null,
      $or: [{ ownerId: userId }, { 'members.userId': userId }, { teamMembers: userId }],
    }).lean();

    const activeProjectIds = userProjects.map((p) => p._id);

    const tasks = await Task.find({
      deletedAt: null,
      $or: [
        { projectId: { $in: activeProjectIds }, assignees: userId },
        { projectId: { $in: activeProjectIds }, createdBy: userId },
        { projectId: null, createdBy: userId },
        { projectId: null, assignees: userId },
      ],
    })
      .sort({ dueDate: 1, updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error: any) {
    console.error('[TaskController] getMyTasks error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve user tasks' },
    });
  }
}

/**
 * PATCH /api/v1/tasks/:id
 * Update a task's title, description, status, priority, assignees, due date, or subtasks.
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

    // Permission check (enforces active membership + private task scoping)
    const { canEditFull, canCollaborate } = await resolveTaskPermissions(task, userId);

    if (!canCollaborate) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to modify this task' },
      });
    }

      const updates = parseResult.data;

      // Non-creator non-admins cannot change core planning fields
      if (!canEditFull) {
        if (
          updates.title ||
          updates.priority ||
          updates.dueDate !== undefined ||
          updates.isPrivate !== undefined
        ) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Only task creators and project admins can edit title, priority, or due dates' },
          });
        }

        // If assignees are modified by a regular member, they can only add or remove themselves
        if (updates.assignees) {
          const currentAssignees = new Set(task.assignees || []);
          const newAssignees = new Set(updates.assignees);

          let onlySelfModified = true;
          for (const uid of currentAssignees) {
            if (!newAssignees.has(uid) && uid !== userId) {
              onlySelfModified = false;
              break;
            }
          }
          for (const uid of newAssignees) {
            if (!currentAssignees.has(uid) && uid !== userId) {
              onlySelfModified = false;
              break;
            }
          }

          if (!onlySelfModified) {
            return res.status(403).json({
              success: false,
              error: { code: 'FORBIDDEN', message: 'Regular members can only assign or unassign themselves' },
            });
          }
        }
      }

      if (updates.title && canEditFull) task.title = updates.title.trim();
      if (updates.description !== undefined) task.description = updates.description.trim();
      if (updates.status) task.status = updates.status;
      if (updates.column !== undefined && updates.column.trim()) {
        task.column = updates.column.trim();
        if (task.projectId) {
          await Project.updateOne(
            { _id: task.projectId },
            { $addToSet: { columns: task.column } }
          );
        }
      }
      if (updates.priority && canEditFull) task.priority = updates.priority;
      if (updates.assignees) task.assignees = updates.assignees;
      if (updates.dueDate !== undefined && canEditFull) task.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
      if (updates.subtasks) task.subtasks = updates.subtasks as any;
      if (updates.isPrivate !== undefined && canEditFull) task.isPrivate = updates.isPrivate;

      await task.save();
      broadcastTaskUpdate(task);

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
 * PUT /api/v1/tasks/:id/move
 * Move a task to a new Kanban column or reorder position.
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

      const task = await Task.findOne({ _id: id, deletedAt: null });
      if (!task) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Task not found' },
        });
      }

      const { canCollaborate: canMove } = await resolveTaskPermissions(task, userId);

      if (!canMove) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have permission to move this task' },
        });
      }

        const { newColumn, newStatus, newOrder } = parseResult.data;

        if (newColumn) {
          task.column = newColumn;
          if (task.projectId) {
            await Project.updateOne(
              { _id: task.projectId },
              { $addToSet: { columns: newColumn } }
            );
          }
        }
        if (newStatus) {
          task.status = newStatus;
        }
        task.order = newOrder;
        await task.save();
        broadcastTaskUpdate(task);

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
 * Soft delete a task. Only Task Creator or Project Admin/Moderator can delete.
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

        const { canEditFull } = await resolveTaskPermissions(task, userId);

        if (!canEditFull) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Only task creators and project admins can delete tasks' },
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

    /**
     * POST /api/v1/tasks/:id/comments
     * Add a comment to a task.
     */
    export async function addTaskComment(req: Request, res: Response) {
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

        const parseResult = addCommentSchema.safeParse(req.body);
        if (!parseResult.success) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid comment payload',
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

        const { canCollaborate: canComment } = await resolveTaskPermissions(task, userId);

        if (!canComment) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'You do not have permission to comment on this task' },
          });
        }

        const profile = await fetchUserProfile(userId);
        const userName = profile.name;
        const userAvatar = profile.avatar;

          const newComment = {
            userId,
            userName,
            userAvatar,
            text: parseResult.data.text.trim(),
            createdAt: new Date(),
          };

          if (!task.comments) {
            task.comments = [];
          }

          task.comments.push(newComment as any);
          await task.save();
          broadcastTaskUpdate(task);

          return res.status(201).json({
            success: true,
            data: task,
          });
        } catch (error: any) {
          console.error('[TaskController] addTaskComment error:', error);
          return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to add comment' },
          });
        }
      }
