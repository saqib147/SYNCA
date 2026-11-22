import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getAuth, clerkClient } from '@clerk/express';
import {
  createProjectSchema,
  updateProjectSchema,
  joinProjectSchema,
  updateMemberRoleSchema,
  addProjectMemberSchema,
} from '@synca/zod-schemas';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { Message } from '../models/Message.js';
import { generateJoinCode, slugify } from '../utils/project-helpers.js';
import { evictUserFromProjectRoom, joinUserToProjectRoom } from '../socket/index.js';
import { fetchUserProfile, lookupUserByExactEmail } from '../utils/clerk-profile.js';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

    // Generate unique slug (always sanitized via slugify; check all docs including soft-deleted)
    let candidateSlug = parseResult.data.slug ? slugify(parseResult.data.slug) : slugify(name);
    if (!candidateSlug) candidateSlug = slugify(name, true);
    let existingSlug = await Project.findOne({ slug: candidateSlug }).lean();
    while (existingSlug) {
      candidateSlug = slugify(candidateSlug, true);
      existingSlug = await Project.findOne({ slug: candidateSlug }).lean();
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

    await joinUserToProjectRoom(userId, String(newProject._id));

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

    // Enforce Private vs Public project privacy
    const existingMember =
      project.ownerId === userId ||
      project.members.find((m) => m.userId === userId);

    if (!existingMember && project.privacy === 'Private') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PRIVATE_PROJECT',
          message: 'This project is private. Ask a Project Admin or Moderator to invite you by email.',
        },
      });
    }

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

    await joinUserToProjectRoom(userId, String(project._id));

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
      const safeSearch = escapeRegex(search.trim().slice(0, 100));
      const regex = new RegExp(safeSearch, 'i');
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
    const isMember =
      userId === project.ownerId ||
      Boolean(userRecord) ||
      project.teamMembers?.includes(userId);

    const updates = parseResult.data;
    const updateKeys = Object.keys(updates).filter(
      (k) => (updates as Record<string, unknown>)[k] !== undefined
    );
    const isBoardLayoutOnlyUpdate =
      updateKeys.length > 0 &&
      updateKeys.every((k) => k === 'columns' || k === 'renameColumn');

    if (isBoardLayoutOnlyUpdate) {
      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You must be a project member to update board columns' },
        });
      }
    } else if (userRole !== 'Admin' && userRole !== 'Moderator') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only Admins and Moderators can edit project details' },
      });
    }

    if (updates.name) project.name = updates.name.trim();
    if (updates.description !== undefined) project.description = updates.description.trim();
    if (updates.status) project.status = updates.status;
    if (updates.privacy) project.privacy = updates.privacy;

    if (updates.goals) project.goals = updates.goals as any;
    if (updates.milestones) project.milestones = updates.milestones as any;
    if (updates.columns) {
      // Deduplicate while preserving exact drag-and-drop column order
      project.columns = Array.from(
        new Set(updates.columns.map((c) => c.trim()).filter(Boolean))
      );
    }

    if (updates.renameColumn) {
      const { from, to } = updates.renameColumn;
      const trimmedTo = to.trim();
      if (trimmedTo && from !== trimmedTo) {
        const currentCols = Array.isArray(project.columns) ? [...project.columns] : [];
        const replaced = currentCols.map((c) => (c === from ? trimmedTo : c));
        if (!replaced.includes(trimmedTo)) replaced.push(trimmedTo);
        project.columns = Array.from(new Set(replaced));

        // Migrate all tasks in the renamed column (including legacy empty-column tasks if renaming Default Column)
        const columnMatch =
          from === 'Default Column'
            ? { $in: [from, '', null] }
            : from;
        await Task.updateMany(
          { projectId: project._id, column: columnMatch, deletedAt: null },
          { $set: { column: trimmedTo } }
        );
      }
    }

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
 * POST /api/v1/projects/:id/members
 * Add a member directly by exact email or shared-project userId (Admin / Moderator).
 */
export async function addProjectMember(req: Request, res: Response) {
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
        error: { code: 'INVALID_ID', message: 'Invalid project ID' },
      });
    }

    const parseResult = addProjectMemberSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0]?.message || 'Invalid member payload',
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

    const callerRecord = project.members?.find((m) => m.userId === userId);
    const callerRole = userId === project.ownerId ? 'Admin' : callerRecord?.role;

    if (callerRole !== 'Admin' && callerRole !== 'Moderator') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only Project Admins and Moderators can add members' },
      });
    }

    // Moderators can only add regular Members
    const requestedRole = callerRole === 'Admin' ? parseResult.data.role || 'Member' : 'Member';

    let targetUserId = parseResult.data.userId;
    let targetName = '';
    let targetAvatar = '';

    if (parseResult.data.email) {
      const found = await lookupUserByExactEmail(parseResult.data.email);
      if (!found) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No Synca account found with that exact email address',
          },
        });
      }
      targetUserId = found.userId;
      targetName = found.name;
      targetAvatar = found.avatarUrl;
    } else if (targetUserId) {
      // Ensure caller already shares another project with this userId (scoped)
      const sharesAnotherProject = await Project.exists({
        deletedAt: null,
        $and: [
          { $or: [{ ownerId: userId }, { 'members.userId': userId }, { teamMembers: userId }] },
          { $or: [{ ownerId: targetUserId }, { 'members.userId': targetUserId }, { teamMembers: targetUserId }] },
        ],
      });
      if (!sharesAnotherProject) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Use exact email to invite users outside your projects' },
        });
      }
      const prof = await fetchUserProfile(targetUserId);
      targetName = prof.name;
      targetAvatar = prof.avatar;
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Target user could not be resolved' },
      });
    }

    const alreadyMember =
      project.ownerId === targetUserId || project.members.some((m) => m.userId === targetUserId);
    if (alreadyMember) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_MEMBER', message: 'This user is already a member of the project' },
      });
    }

    project.members.push({
      userId: targetUserId,
      role: requestedRole,
      joinedAt: new Date(),
    });
    if (!project.teamMembers.includes(targetUserId)) {
      project.teamMembers.push(targetUserId);
    }

    await project.save();
    await joinUserToProjectRoom(targetUserId, String(project._id));

    return res.status(201).json({
      success: true,
      data: {
        userId: targetUserId,
        name: targetName,
        avatarUrl: targetAvatar,
        role: requestedRole,
      },
    });
  } catch (error: any) {
    console.error('[ProjectController] addProjectMember error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to add member to project' },
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid project ID' },
      });
    }

    const parseResult = updateMemberRoleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid role. Allowed: Admin, Moderator, Member' },
      });
    }
    const { role } = parseResult.data;

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
    if (!targetMember) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Target user is not a member of this project' },
      });
    }

    // Prevent demoting the sole remaining Admin
    const isCurrentlyAdmin = targetMember.role === 'Admin' || project.ownerId === targetUserId;
    if (isCurrentlyAdmin && role !== 'Admin') {
      const otherAdmins = project.members.filter(
        (m) => m.userId !== targetUserId && (m.role === 'Admin' || m.userId === project.ownerId)
      );
      if (otherAdmins.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'SOLE_ADMIN',
            message: 'Cannot demote the sole Project Admin. Promote another Admin first.',
          },
        });
      }
      // Transfer ownership if the owner is being demoted
      if (project.ownerId === targetUserId) {
        project.ownerId = otherAdmins[0].userId;
      }
    }

    targetMember.role = role;
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid project ID' },
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

    const isSelfLeaving = userId === targetUserId;
    if (!isSelfLeaving && callerRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only Project Admins can remove members' },
      });
    }

    const targetMember = project.members.find((m) => m.userId === targetUserId);
    const isTargetAdmin = targetMember?.role === 'Admin' || project.ownerId === targetUserId;
    if (isTargetAdmin) {
      const otherAdmins = project.members.filter(
        (m) => m.userId !== targetUserId && (m.role === 'Admin' || m.userId === project.ownerId)
      );
      if (otherAdmins.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'SOLE_ADMIN',
            message: 'Cannot remove the sole Project Admin. Promote another Admin or delete the project.',
          },
        });
      }
      if (project.ownerId === targetUserId) {
        project.ownerId = otherAdmins[0].userId;
      }
    }

    project.members = project.members.filter((m) => m.userId !== targetUserId);
    project.teamMembers = project.teamMembers.filter((uid) => uid !== targetUserId);

    await project.save();

    // Unassign the removed/departed member from all tasks in this project
    await Task.updateMany(
      { projectId: project._id, assignees: targetUserId, deletedAt: null },
      { $pull: { assignees: targetUserId } }
    );

    await evictUserFromProjectRoom(targetUserId, String(project._id));

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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid project ID' },
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
 * Soft delete a project and cascade to tasks and channel messages.
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
        error: { code: 'INVALID_ID', message: 'Invalid project ID' },
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
        error: { code: 'FORBIDDEN', message: 'Only Project Admins can delete projects' },
      });
    }

    const now = new Date();
    project.deletedAt = now;
    await project.save();

    // Cascade soft delete all tasks and project channel messages
    await Promise.all([
      Task.updateMany({ projectId: project._id, deletedAt: null }, { deletedAt: now }),
      Message.updateMany(
        { channelType: 'channel', channelId: String(project._id), deletedAt: null },
        { deletedAt: now }
      ),
    ]);

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
