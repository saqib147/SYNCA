/** Project-scoped roles (active RBAC). Legacy Room roles are removed. */
export type ProjectRole = 'Admin' | 'Moderator' | 'Member';

/** @deprecated Use ProjectRole. Kept briefly for any leftover imports. */
export type Role = ProjectRole;

export type Permission =
  | 'project:manage_settings'
  | 'project:manage_members'
  | 'project:edit'
  | 'project:delete'
  | 'task:create'
  | 'task:edit'
  | 'task:delete'
  | 'task:assign'
  | 'milestone:manage'
  | 'chat:send'
  | 'chat:read'
  | 'chat:moderate'
  | 'file:upload';

export const ALL_PERMISSIONS: Permission[] = [
  'project:manage_settings',
  'project:manage_members',
  'project:edit',
  'project:delete',
  'task:create',
  'task:edit',
  'task:delete',
  'task:assign',
  'milestone:manage',
  'chat:send',
  'chat:read',
  'chat:moderate',
  'file:upload',
];

export const PROJECT_ROLE_PERMISSIONS: Record<ProjectRole, Permission[]> = {
  Admin: [...ALL_PERMISSIONS],
  Moderator: [
    'project:edit',
    'task:create',
    'task:edit',
    'task:delete',
    'task:assign',
    'milestone:manage',
    'chat:send',
    'chat:read',
    'chat:moderate',
    'file:upload',
  ],
  Member: [
    'task:create',
    'task:edit',
    'chat:send',
    'chat:read',
    'file:upload',
  ],
};

/** @deprecated Prefer PROJECT_ROLE_PERMISSIONS */
export const ROLE_PERMISSIONS = PROJECT_ROLE_PERMISSIONS;

export function hasPermission(role: ProjectRole, requiredPermission: Permission): boolean {
  const rolePerms = PROJECT_ROLE_PERMISSIONS[role] ?? [];
  return rolePerms.includes(requiredPermission);
}

/** Stable DM channel id: sorted Clerk userId pair joined by `:`. */
export function dmChannelId(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join(':');
}

export function parseDmChannelId(channelId: string): [string, string] | null {
  const parts = channelId.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}
