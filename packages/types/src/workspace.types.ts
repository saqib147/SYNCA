export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceMember {
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date | string;
}

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  joinCode: string;
  ownerId: string;
  members: WorkspaceMember[];
  isPrivate: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}
