import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getAuth, clerkClient } from '@clerk/express';
import { createProjectSchema, updateProjectSchema, joinProjectSchema } from '@synca/zod-schemas';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { generateJoinCode, slugify } from '../utils/project-helpers.js';

const getUserId = (req: Request): string | undefined => {
  try {
    return (req as any).auth?.userId || getAuth(req)?.userId;
  } catch {
    return (req as any).auth?.userId;
  }
};

/**
 * POST /api/v1/projects
 * Create a new top-level project.
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

    const { name, description, status, privacy, teamMembers, goals, milestones } = parseResult.data;

    // Generate unique slug
    let candidateSlug = parseResult.data.slug || slugify(name);
    const existingSlug = await Project.findOne({ slug: candidateSlug, deletedAt: null }).lean();
    if (existingSlug) {
      candidateSlug = slugify(name, true);
    }

    // Generate unique join code
    let joinCode = generateJoinCode();
    let existingCode = await Project.findOne({ joinCode }).lean();
    while (existingCode) {
      joinCode = generateJoinCode();
      existingCode = await Project.findOne({ joinCode }).lean();
    }

    // Build members map (Creator is Admin)
    const inputMembers = parseResult.data.members || [];
    const membersMap = new Map<string, { role: 'Admin' | 'Moderator' | 'Member'; joinedAt: Date }>();

    (teamMembers || []).forEach((uid) =>
      membersMap.set(uid, { role: 'Member', joinedAt: new Date() })
    );

    inputMembers.forEach((m) =>
      membersMap.set(m.userId, { role: m.role as any, joinedAt: new Date() })
    );

    // Creator is always Admin
    membersMap.set(userId, { role: 'Admin', joinedAt: new Date() });

    const finalMembersList = Array.from(membersMap.entries()).map(([uId, data]) => ({
      userId: uId,
      role: data.role,
      joinedAt: data.joinedAt,
    }));
    const finalTeamMemberIds = Array.from(membersMap.keys());

    const newProject = await Project.create({
      ownerId: userId,
      joinCode,
      name,
      slug: candidateSlug,
      description: description || '',
      status: status || 'ActiveSprint',
      privacy: privacy || 'Public',
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
 * POST /api/v1/projects/join
 * Join an existing project using a 6-character join code.
 */
export async function joinProject(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const parseResult = joinProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '6-character uppercase join code required',
        },
      });
    }

    const cleanCode = parseResult.data.joinCode.trim().toUpperCase();
    const project = await Project.findOne({ joinCode: cleanCode, deletedAt: null });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invalid or expired project join code' },
      });
    }

    // Check if user is already a member
    const existingMember = project.members.find((m) => m.userId === userId);
    if (!existingMember) {
      project.members.push({
        userId,
        role: 'Member',
        joinedAt: new Date(),
      });
      if (!project.teamMembers.includes(userId)) {
        project.teamMembers.push(userId);
      }
      await project.save();
    }

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    console.error('[ProjectController] joinProject error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to join project' },
    });
  }
}

/**
 * GET /api/v1/projects
 * List all active projects the user is a member of.
 */
export async function getUserProjects(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const { status, search } = req.query;

    const query: any = {
      deletedAt: null,
      $or: [{ ownerId: userId }, { 'members.userId': userId }, { teamMembers: userId }],
    };

    if (status && typeof status === 'string') {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$and = [{ $or: [{ name: regex }, { description: regex }] }];
    }

    const projects = await Project.find(query).sort({ updatedAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error: any) {
    console.error('[ProjectController] getUserProjects error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve projects' },
    });
  }
}

/**
 * GET /api/v1/projects/:id
 * Retrieve a project by ObjectId or slug.
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

    // Check membership
    const isMember =
      project.ownerId === userId ||
      (project.members && project.members.some((m: any) => m.userId === userId)) ||
      project.teamMembers?.includes(userId);

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You must be a project member to view details' },
      });
    }

    // Fetch profile details for team members from Clerk
    let teamMemberProfiles: Array<{
      userId: string;
      name?: string;
      email?: string;
      imageUrl?: string;
      projectRole?: 'Admin' | 'Moderator' | 'Member';
    }> = [];

    const memberUserIds = Array.from(
      new Set([
        ...(project.teamMembers || []),
        ...(project.members?.map((m: any) => m.userId) || []),
        project.ownerId,
      ])
    ).filter(Boolean);

    if (memberUserIds.length > 0) {
      try {
        const clerkUsers = await clerkClient.users.getUserList({ userId: memberUserIds, limit: 50 });
        const memberRoleMap = new Map<string, 'Admin' | 'Moderator' | 'Member'>();
        (project.members || []).forEach((m: any) => memberRoleMap.set(m.userId, m.role));

        teamMemberProfiles = clerkUsers.data.map((u) => {
          let derivedRole: 'Admin' | 'Moderator' | 'Member' = memberRoleMap.get(u.id) || 'Member';
          if (u.id === project.ownerId) derivedRole = 'Admin';

          return {
            userId: u.id,
            name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Team Member',
            email: u.emailAddresses?.[0]?.emailAddress,
            imageUrl: u.imageUrl,
            projectRole: derivedRole,
          };
        });
      } catch (err) {
        console.warn('[getProjectById] Failed to fetch team members from Clerk:', err);
      }
    }

    const userMemberRecord = project.members?.find((m: any) => m.userId === userId);
    const currentUserRole =
      userId === project.ownerId ? 'Admin' : userMemberRecord?.role || 'Member';

    return res.status(200).json({
      success: true,
      data: {
        ...project,
        currentUserRole,
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
 * Update project metadata, status, brief, goals, or milestones (Admin or Moderator).
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

    const userRecord = project.members?.find((m) => m.userId === userId);
    const userRole = userId === project.ownerId ? 'Admin' : userRecord?.role;

    if (userRole !== 'Admin' && userRole !== 'Moderator') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only Admins and Moderators can edit project details' },
      });
    }

    const updates = parseResult.data;
    if (updates.name) project.name = updates.name.trim();
    if (updates.description !== undefined) project.description = updates.description.trim();
    if (updates.status) project.status = updates.status;
    if (updates.privacy) project.privacy = updates.privacy;

    if (updates.members && updates.members.length > 0) {
      project.members = updates.members.map((m) => ({
        userId: m.userId,
        role: m.role as any,
        joinedAt: new Date(),
      }));
      project.teamMembers = updates.members.map((m) => m.userId);
    }

    if (updates.goals) project.goals = updates.goals as any;
    if (updates.milestones) project.milestones = updates.milestones as any;

    await project.save();

    return res.status(200).json({
      success: true,
      data: project,
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
 * PATCH /api/v1/projects/:id/members/:targetUserId/role
 * Update member role (Admin only).
 */
export async function updateMemberRole(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const { id, targetUserId } = req.params;
    const { role } = req.body;

    if (!['Admin', 'Moderator', 'Member'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid role. Allowed: Admin, Moderator, Member' },
      });
    }

    const project = await Project.findOne({ _id: id, deletedAt: null });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const callerRecord = project.members?.find((m) => m.userId === userId);
    const callerRole = userId === project.ownerId ? 'Admin' : callerRecord?.role;

    if (callerRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only Project Admins can manage member roles' },
      });
    }

    const targetMember = project.members.find((m) => m.userId === targetUserId);
    if (targetMember) {
      targetMember.role = role as any;
    } else {
      project.members.push({
        userId: targetUserId,
        role: role as any,
        joinedAt: new Date(),
      });
      if (!project.teamMembers.includes(targetUserId)) {
        project.teamMembers.push(targetUserId);
      }
    }

    await project.save();

    return res.status(200).json({
      success: true,
      data: { userId: targetUserId, role },
    });
  } catch (error: any) {
    console.error('[ProjectController] updateMemberRole error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update member role' },
    });
  }
}

/**
 * DELETE /api/v1/projects/:id/members/:targetUserId
 * Remove member from project or leave project.
 */
export async function removeMember(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }

    const { id, targetUserId } = req.params;

    const project = await Project.findOne({ _id: id, deletedAt: null });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const callerRecord = project.members?.find((m) => m.userId === userId);
    const callerRole = userId === project.ownerId ? 'Admin' : callerRecord?.role;

    const isSelfLeaving = userId === targetUserId;
    if (!isSelfLeaving && callerRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only Project Admins can remove members' },
      });
    }

    project.members = project.members.filter((m) => m.userId !== targetUserId);
    project.teamMembers = project.teamMembers.filter((uid) => uid !== targetUserId);

    await project.save();

    return res.status(200).json({
      success: true,
      data: { message: 'Member removed successfully' },
    });
  } catch (error: any) {
    console.error('[ProjectController] removeMember error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member' },
    });
  }
}

/**
 * POST /api/v1/projects/:id/join-code/reset
 * Regenerate join code (Admin only).
 */
export async function regenerateJoinCode(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User session required' },
      });
    }
    const { id } = req.params;

    const project = await Project.findOne({ _id: id, deletedAt: null });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const callerRecord = project.members?.find((m) => m.userId === userId);
    const callerRole = userId === project.ownerId ? 'Admin' : callerRecord?.role;

    if (callerRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only Project Admins can reset the join code' },
      });
    }

    let newCode = generateJoinCode();
    let existingCode = await Project.findOne({ joinCode: newCode }).lean();
    while (existingCode) {
      newCode = generateJoinCode();
      existingCode = await Project.findOne({ joinCode: newCode }).lean();
    }

    project.joinCode = newCode;
    await project.save();

    return res.status(200).json({
      success: true,
      data: { joinCode: newCode },
    });
  } catch (error: any) {
    console.error('[ProjectController] regenerateJoinCode error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to reset join code' },
    });
  }
}

/**
 * DELETE /api/v1/projects/:id
 * Soft delete a project and cascade to tasks.
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

    const project = await Project.findOne({ _id: id, deletedAt: null });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    const callerRecord = project.members?.find((m) => m.userId === userId);
    const callerRole = userId === project.ownerId ? 'Admin' : callerRecord?.role;

    if (callerRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only Project Admins can delete projects' },
      });
    }

    project.deletedAt = new Date();
    await project.save();

    // Cascade soft delete all tasks in project
    await Task.updateMany(
      { projectId: project._id, deletedAt: null },
      { deletedAt: new Date() }
    );

    return res.status(200).json({
      success: true,
      data: { id: project._id, message: 'Project deleted successfully' },
    });
  } catch (error: any) {
    console.error('[ProjectController] deleteProject error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete project' },
    });
  }
}
