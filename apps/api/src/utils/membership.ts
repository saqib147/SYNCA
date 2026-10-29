import { Project } from '../models/Project.js';

export function isProjectMember(project: any, userId: string): boolean {
  if (!project || !userId) return false;
  if (project.ownerId === userId) return true;
  if (Array.isArray(project.members) && project.members.some((m: any) => m.userId === userId)) {
    return true;
  }
  if (Array.isArray(project.teamMembers) && project.teamMembers.includes(userId)) {
    return true;
  }
  return false;
}

export function isProjectAdminOrMod(project: any, userId: string): boolean {
  if (!project || !userId) return false;
  if (project.ownerId === userId) return true;
  if (Array.isArray(project.members)) {
    return project.members.some(
      (m: any) => m.userId === userId && (m.role === 'Admin' || m.role === 'Moderator')
    );
  }
  return false;
}

export function getProjectRole(project: any, userId: string): 'Admin' | 'Moderator' | 'Member' | null {
  if (!isProjectMember(project, userId)) return null;
  if (project.ownerId === userId) return 'Admin';
  const record = project.members?.find((m: any) => m.userId === userId);
  return (record?.role as 'Admin' | 'Moderator' | 'Member') || 'Member';
}

export async function findActiveProject(projectId: string) {
  if (!projectId) return null;
  return Project.findOne({ _id: projectId, deletedAt: null });
}

/** Stable DM channel id: sorted Clerk userId pair. */
export function dmChannelId(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join(':');
}

export function isDmParticipant(channelId: string, userId: string): boolean {
  const parts = channelId.split(':');
  return parts.length === 2 && (parts[0] === userId || parts[1] === userId);
}

export function extractPlainText(content: unknown): string {
  if (typeof content === 'string') return content.slice(0, 2000);
  if (!content || typeof content !== 'object') return '';

  const texts: string[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (typeof node.text === 'string') texts.push(node.text);
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(content);
  return texts.join(' ').trim().slice(0, 2000);
}
