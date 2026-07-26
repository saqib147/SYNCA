"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.ALL_PERMISSIONS = void 0;
exports.hasPermission = hasPermission;
exports.ALL_PERMISSIONS = [
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
exports.ROLE_PERMISSIONS = {
    Owner: [...exports.ALL_PERMISSIONS],
    Admin: [...exports.ALL_PERMISSIONS],
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
function hasPermission(role, customPermissions = [], requiredPermission) {
    const rolePerms = exports.ROLE_PERMISSIONS[role] ?? [];
    const effective = new Set([...rolePerms, ...customPermissions]);
    return effective.has(requiredPermission);
}
