import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getAuth, clerkClient } from '@clerk/express';
import { createProjectSchema, updateProjectSchema } from '@synca/zod-schemas';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { Workspace } from '../models/Workspace.js';
import { slugify } from '../utils/workspace-helpers.js';

const getUserId = (req: Request): string | undefined => {
  try {
    return (req as any).auth?.userId || getAuth(req)?.userId;
  } catch {
    return (req as any).auth?.userId;
  }
};

/**
 * POST /api/v1/projects
 * Create a new project within an active workspace.
 */
export async function createProject(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const parseResult = createProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project payload',
          details: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    const { workspaceId, roomId, name, description, status, privacy, teamMembers, goals, milestones } = parseResult.data;
    const targetWorkspaceId = workspaceId || roomId;

    if (!targetWorkspaceId || !mongoose.Types.ObjectId.isValid(targetWorkspaceId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid workspace ID is required' },
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

    const isMember = workspace.members.some((m) => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You must be a member of this workspace to create projects' },
      });
    }

    // Generate unique slug within workspace
    let candidateSlug = parseResult.data.slug || slugify(name);
    const existingSlug = await Project.findOne({ workspaceId: targetWorkspaceId, slug: candidateSlug }).lean();
    if (existingSlug) {
      candidateSlug = slugify(name, true);
    }

    // Ensure creator is in team members and assigned 'Admin' role
    const inputMembers = parseResult.data.members || [];
    const membersMap = new Map<string, 'Admin' | 'Member' | 'Viewer'>();

    // Any teamMembers strings default to 'Member'
    (teamMembers || []).forEach((uid) => membersMap.set(uid, 'Member'));

    // Any explicit members with roles
    inputMembers.forEach((m) => membersMap.set(m.userId, m.role));

    // Creator is always Admin / PM
    membersMap.set(userId, 'Admin');

    const finalMembersList = Array.from(membersMap.entries()).map(([uId, r]) => ({
      userId: uId,
      role: r,
    }));
    const finalTeamMemberIds = Array.from(membersMap.keys());

    const newProject = await Project.create({
      workspaceId: targetWorkspaceId,
      name,
      slug: candidateSlug,
      description: description || '',
      status: status || 'ActiveSprint',
      privacy: privacy || 'RoomWide',
      teamMembers: finalTeamMemberIds,
      members: finalMembersList,
      goals: goals || [],
      milestones: milestones || [],
    });

    return res.status(201).json({
      success: true,
      data: newProject,
    });
  } catch (error: any) {
    console.error('[ProjectController] createProject error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create project' },
    });
  }
}

/**
 * GET /api/v1/projects
 * List all active projects in a workspace (with optional status & text filter).
 */
export async function getWorkspaceProjects(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const { workspaceId, status, search } = req.query;
    if (!workspaceId || typeof workspaceId !== 'string' || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid workspaceId query parameter required' },
      });
    }

    // Verify caller is member
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    const isMember = workspace.members.some((m) => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You must be a member of this workspace to view projects' },
      });
    }

    const callerMember = workspace.members.find((m) => m.userId === userId);
    const isPrivileged = callerMember?.role === 'owner' || callerMember?.role === 'admin' || workspace.ownerId === userId;

    const query: any = {
      workspaceId,
      deletedAt: null,
    };

    // Non-privileged users only see RoomWide/Public projects OR Private projects where they are in teamMembers
    if (!isPrivileged) {
      query.$and = [
        {
          $or: [
            { privacy: { $ne: 'Private' } },
            { teamMembers: userId },
          ],
        },
      ];
    }

    if (status && typeof status === 'string') {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      const searchCondition = { $or: [{ name: regex }, { description: regex }] };
      if (query.$and) {
        query.$and.push(searchCondition);
      } else {
        query.$and = [searchCondition];
      }
    }

    const projects = await Project.find(query).sort({ updatedAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error: any) {
    console.error('[ProjectController] getWorkspaceProjects error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve projects' },
    });
  }
}

/**
 * GET /api/v1/projects/:id
 * Retrieve a project by its ObjectId or slug.
 */
export async function getProjectById(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }
    const { id } = req.params;

    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    const project = await Project.findOne({ ...query, deletedAt: null }).lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Verify caller is member of workspace
    const workspace = await Workspace.findById(project.workspaceId).lean();
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found' },
      });
    }

    const isMember = workspace.members.some((m) => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied to this project' },
      });
    }

    // Enforce private project visibility
    const callerMember = workspace.members.find((m) => m.userId === userId);
    const isPrivileged = callerMember?.role === 'owner' || callerMember?.role === 'admin' || workspace.ownerId === userId;
    const isTeamMember = project.teamMembers?.includes(userId);

    if (project.privacy === 'Private' && !isTeamMember && !isPrivileged) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'This project is private and accessible only to assigned team members' },
      });
    }

    // Fetch profile details for team members from Clerk with their project role
    let teamMemberProfiles: Array<{ userId: string; name?: string; email?: string; imageUrl?: string; projectRole?: 'Admin' | 'Member' | 'Viewer' }> = [];
    if (project.teamMembers && project.teamMembers.length > 0) {
      try {
        const clerkUsers = await clerkClient.users.getUserList({ userId: project.teamMembers, limit: 50 });
        const memberRoleMap = new Map<string, 'Admin' | 'Member' | 'Viewer'>();
        (project.members || []).forEach((m: any) => memberRoleMap.set(m.userId, m.role));

        teamMemberProfiles = clerkUsers.data.map((u) => ({
          userId: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Team Member',
          email: u.emailAddresses?.[0]?.emailAddress,
          imageUrl: u.imageUrl,
          projectRole: memberRoleMap.get(u.id) || (u.id === workspace.ownerId ? 'Admin' : 'Member'),
        }));
      } catch (err) {
        console.warn('[getProjectById] Failed to fetch team members from Clerk:', err);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        ...project,
        teamMemberProfiles,
      },
    });
  } catch (error: any) {
    console.error('[ProjectController] getProjectById error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve project' },
    });
  }
}

/**
 * PATCH /api/v1/projects/:id
 * Update project metadata, status, brief, goals, or milestones.
 */
export async function updateProject(req: Request, res: Response) {
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
        error: { code: 'VALIDATION_ERROR', message: 'Valid project ID required' },
      });
    }

    const parseResult = updateProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project update payload',
          details: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }

    const project = await Project.findOne({ _id: id, deletedAt: null });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Verify workspace membership and permissions
    const workspace = await Workspace.findById(project.workspaceId).lean();
    const callerMember = workspace?.members.find((m) => m.userId === userId);
    if (!callerMember) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to edit this project' },
      });
    }

    const isPrivileged = callerMember.role === 'owner' || callerMember.role === 'admin' || workspace?.ownerId === userId;
    const isTeamMember = project.teamMembers?.includes(userId);

    if (project.privacy === 'Private' && !isTeamMember && !isPrivileged) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'This project is private and can only be updated by assigned team members' },
      });
    }

    const updates = parseResult.data;
    if (updates.name) project.name = updates.name.trim();
    if (updates.description !== undefined) project.description = updates.description.trim();
    if (updates.status) project.status = updates.status;
    if (updates.privacy) project.privacy = updates.privacy;
    if (updates.members && updates.members.length > 0) {
      project.members = updates.members as any;
      project.teamMembers = updates.members.map((m: any) => m.userId);
    } else if (updates.teamMembers) {
      project.teamMembers = updates.teamMembers;
      const existingMap = new Map<string, 'Admin' | 'Member' | 'Viewer'>();
      (project.members || []).forEach((m: any) => existingMap.set(m.userId, m.role));
      project.members = updates.teamMembers.map((uid) => ({
        userId: uid,
        role: existingMap.get(uid) || 'Member',
      })) as any;
    }
    if (updates.goals) project.goals = updates.goals as any;
    if (updates.milestones) project.milestones = updates.milestones as any;

    await project.save();

    // Fetch profile details for team members from Clerk with project role
    let teamMemberProfiles: Array<{ userId: string; name?: string; email?: string; imageUrl?: string; projectRole?: 'Admin' | 'Member' | 'Viewer' }> = [];
    if (project.teamMembers && project.teamMembers.length > 0) {
      try {
        const clerkUsers = await clerkClient.users.getUserList({ userId: project.teamMembers, limit: 50 });
        const memberRoleMap = new Map<string, 'Admin' | 'Member' | 'Viewer'>();
        (project.members || []).forEach((m: any) => memberRoleMap.set(m.userId, m.role));

        teamMemberProfiles = clerkUsers.data.map((u) => ({
          userId: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Team Member',
          email: u.emailAddresses?.[0]?.emailAddress,
          imageUrl: u.imageUrl,
          projectRole: memberRoleMap.get(u.id) || (u.id === workspace?.ownerId ? 'Admin' : 'Member'),
        }));
      } catch (err) {
        console.warn('[updateProject] Failed to fetch team members from Clerk:', err);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        ...project.toObject(),
        teamMemberProfiles,
      },
    });
  } catch (error: any) {
    console.error('[ProjectController] updateProject error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update project' },
    });
  }
}

/**
 * DELETE /api/v1/projects/:id
 * Soft delete or archive a project.
 */
export async function deleteProject(req: Request, res: Response) {
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
        error: { code: 'VALIDATION_ERROR', message: 'Valid project ID required' },
      });
    }

    const project = await Project.findOne({ _id: id, deletedAt: null });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    // Verify caller is admin or owner of the workspace
    const workspace = await Workspace.findById(project.workspaceId).lean();
    const callerMember = workspace?.members.find((m) => m.userId === userId);
    const isPrivileged = callerMember?.role === 'owner' || callerMember?.role === 'admin';

    if (!isPrivileged) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only workspace admins or owners can delete projects' },
      });
    }

    project.deletedAt = new Date();
    await project.save();

    // Cascade soft-delete all tasks belonging to this project
    await Task.updateMany(
      { projectId: project._id, deletedAt: null },
      { deletedAt: new Date() }
    );

    return res.status(200).json({
      success: true,
      data: { id: project._id, message: 'Project archived successfully' },
    });
  } catch (error: any) {
    console.error('[ProjectController] deleteProject error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete project' },
    });
  }
}
