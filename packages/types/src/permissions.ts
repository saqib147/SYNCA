export type Role = 'Owner' | 'Admin' | 'Manager' | 'Member' | 'Viewer' | 'Guest';

export type Permission =
  | 'room:manage_settings'
  | 'room:manage_members'
  | 'project:create'
  | 'project:view'
  | 'project:edit'
  | 'project:delete'
  | 'project:manage_members'
  | 'task:create'
  | 'task:edit'
  | 'task:delete'
  | 'task:assign'
  | 'milestone:manage'
  | 'chat:send'
  | 'chat:read'
  | 'file:upload';

export const ALL_PERMISSIONS: Permission[] = [
  'room:manage_settings',
  'room:manage_members',
  'project:create',
  'project:view',
  'project:edit',
  'project:delete',
  'project:manage_members',
  'task:create',
  'task:edit',
  'task:delete',
  'task:assign',
  'milestone:manage',
  'chat:send',
  'chat:read',
  'file:upload',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Owner: [...ALL_PERMISSIONS],
  Admin: [...ALL_PERMISSIONS],
  Manager: [
    'project:view',
    'project:edit',
    'project:manage_members',
    'task:create',
    'task:edit',
    'task:delete',
    'task:assign',
    'milestone:manage',
    'chat:send',
    'chat:read',
    'file:upload',
  ],
  Member: [
    'project:create',
    'project:view',
    'task:create',
    'task:edit',
    'chat:send',
    'chat:read',
    'file:upload',
  ],
  Viewer: ['project:view', 'chat:read'],
  Guest: ['project:view', 'chat:read'],
};

export function hasPermission(
  role: Role,
  customPermissions: Permission[] = [],
  requiredPermission: Permission
): boolean {
  const rolePerms = ROLE_PERMISSIONS[role] ?? [];
  const effective = new Set([...rolePerms, ...customPermissions]);
  return effective.has(requiredPermission);
}
