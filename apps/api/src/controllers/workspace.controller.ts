import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  createWorkspaceSchema,
  joinWorkspaceSchema,
  updateWorkspaceSchema,
} from '@synca/zod-schemas';
import { Workspace } from '../models/Workspace.js';
import { generateJoinCode, slugify } from '../utils/workspace-helpers.js';

/**
 * POST /api/v1/workspaces
 * Create a new workspace and assign caller as owner.
 */
export async function createWorkspace(req: Request, res: Response) {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const parseResult = createWorkspaceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid workspace payload',
          details: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    const { name, description, isPrivate } = parseResult.data;

    // Generate unique slug
    let candidateSlug = parseResult.data.slug || slugify(name);
    const existingSlug = await Workspace.findOne({ slug: candidateSlug }).lean();
    if (existingSlug) {
      candidateSlug = slugify(name, true);
    }

    // Generate unique join code
    let joinCode = generateJoinCode(6);
    let attempts = 0;
    while (await Workspace.findOne({ joinCode }).lean()) {
      joinCode = generateJoinCode(6);
      attempts++;
      if (attempts > 10) {
        joinCode = generateJoinCode(8);
      }
    }

    const workspace = new Workspace({
      name,
      slug: candidateSlug,
      description: description || '',
      joinCode,
      ownerId: userId,
      isPrivate: isPrivate ?? false,
      members: [
        {
          userId,
          role: 'owner',
          joinedAt: new Date(),
        },
      ],
    });

    await workspace.save();

    return res.status(201).json({
      success: true,
      data: workspace,
    });
  } catch (error: any) {
    console.error('[WorkspaceController] createWorkspace error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create workspace' },
    });
  }
}

/**
 * GET /api/v1/workspaces
 * List all workspaces the authenticated user is a member of.
 */
export async function getUserWorkspaces(req: Request, res: Response) {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const workspaces = await Workspace.find({
      'members.userId': userId,
    })
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: workspaces,
    });
  } catch (error: any) {
    console.error('[WorkspaceController] getUserWorkspaces error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve workspaces' },
    });
  }
}

/**
 * GET /api/v1/workspaces/:id
 * Retrieve a workspace by its MongoDB ObjectId or slug.
 */
export async function getWorkspaceById(req: Request, res: Response) {
  try {
    const userId = (req as any).auth?.userId;
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    const workspace = await Workspace.findOne(query).lean();

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    const isMember = workspace.members.some((m) => m.userId === userId);

    // If private, only members may view details
    if (workspace.isPrivate && !isMember) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'This workspace is private and accessible only to invited members',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: workspace,
    });
  } catch (error: any) {
    console.error('[WorkspaceController] getWorkspaceById error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve workspace' },
    });
  }
}

/**
 * POST /api/v1/workspaces/join
 * Join a workspace via 6-character alphanumeric join code.
 */
export async function joinWorkspace(req: Request, res: Response) {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const parseResult = joinWorkspaceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid join code payload',
          details: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    const joinCode = parseResult.data.joinCode.toUpperCase().trim();
    const workspace = await Workspace.findOne({ joinCode });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Invalid or non-existent join code. Please verify the code and try again.',
        },
      });
    }

    const alreadyMember = workspace.members.some((m) => m.userId === userId);
    if (alreadyMember) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_MEMBER',
          message: 'You are already a member of this workspace',
        },
        data: workspace,
      });
    }

    workspace.members.push({
      userId,
      role: 'member',
      joinedAt: new Date(),
    });

    await workspace.save();

    return res.status(200).json({
      success: true,
      data: workspace,
    });
  } catch (error: any) {
    console.error('[WorkspaceController] joinWorkspace error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to join workspace' },
    });
  }
}

/**
 * PATCH /api/v1/workspaces/:id
 * Update workspace metadata (name, description, isPrivate). Requires owner or admin role.
 */
export async function updateWorkspace(req: Request, res: Response) {
  try {
    const userId = (req as any).auth?.userId;
    const { id } = req.params;

    const parseResult = updateWorkspaceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update payload',
          details: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    const workspace = await Workspace.findOne(query);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    const memberRecord = workspace.members.find((m) => m.userId === userId);
    const hasAdminRights =
      workspace.ownerId === userId ||
      memberRecord?.role === 'owner' ||
      memberRecord?.role === 'admin';

    if (!hasAdminRights) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You must be an owner or admin to modify workspace settings',
        },
      });
    }

    const { name, description, isPrivate } = parseResult.data;
    if (name !== undefined) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    if (isPrivate !== undefined) workspace.isPrivate = isPrivate;

    await workspace.save();

    return res.status(200).json({
      success: true,
      data: workspace,
    });
  } catch (error: any) {
    console.error('[WorkspaceController] updateWorkspace error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update workspace' },
    });
  }
}

/**
 * DELETE /api/v1/workspaces/:id/members/:userId
 * Remove a member from the workspace or allow a member to leave.
 */
export async function removeMember(req: Request, res: Response) {
  try {
    const requesterId = (req as any).auth?.userId;
    const { id, userId: targetUserId } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    const workspace = await Workspace.findOne(query);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    const targetIndex = workspace.members.findIndex((m) => m.userId === targetUserId);
    if (targetIndex === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Target user is not a member of this workspace' },
      });
    }

    // Owner cannot be removed or leave without transferring ownership
    if (targetUserId === workspace.ownerId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_REMOVE_OWNER',
          message: 'The workspace owner cannot leave or be removed. Transfer ownership first.',
        },
      });
    }

    const isSelfLeaving = requesterId === targetUserId;
    const requesterMember = workspace.members.find((m) => m.userId === requesterId);
    const hasAdminRights =
      workspace.ownerId === requesterId ||
      requesterMember?.role === 'owner' ||
      requesterMember?.role === 'admin';

    if (!isSelfLeaving && !hasAdminRights) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to remove members from this workspace',
        },
      });
    }

    workspace.members.splice(targetIndex, 1);
    await workspace.save();

    return res.status(200).json({
      success: true,
      data: {
        message: isSelfLeaving
          ? 'You have left the workspace'
          : 'Member removed successfully',
        workspace,
      },
    });
  } catch (error: any) {
    console.error('[WorkspaceController] removeMember error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member' },
    });
  }
}

/**
 * DELETE /api/v1/workspaces/:id
 * Delete a workspace. Requires owner role.
 */
export async function deleteWorkspace(req: Request, res: Response) {
  try {
    const userId = (req as any).auth?.userId;
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    const workspace = await Workspace.findOne(query);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    if (workspace.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only the workspace owner can delete this workspace',
        },
      });
    }

    await Workspace.findByIdAndDelete(workspace._id);

    return res.status(200).json({
      success: true,
      data: {
        message: 'Workspace deleted successfully',
        id: workspace._id,
      },
    });
  } catch (error: any) {
    console.error('[WorkspaceController] deleteWorkspace error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete workspace' },
    });
  }
}
