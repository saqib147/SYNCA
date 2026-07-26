export type Role = 'Owner' | 'Admin' | 'Manager' | 'Member' | 'Viewer' | 'Guest';
export type Permission = 'room:manage_settings' | 'room:manage_members' | 'project:create' | 'project:view' | 'project:edit' | 'project:delete' | 'project:manage_members' | 'task:create' | 'task:edit' | 'task:delete' | 'task:assign' | 'milestone:manage' | 'chat:send' | 'chat:read' | 'file:upload';
export declare const ALL_PERMISSIONS: Permission[];
export declare const ROLE_PERMISSIONS: Record<Role, Permission[]>;
export declare function hasPermission(role: Role, customPermissions: Permission[] | undefined, requiredPermission: Permission): boolean;
