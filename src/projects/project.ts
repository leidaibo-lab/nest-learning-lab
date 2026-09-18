export type ProjectRole = 'owner' | 'member';

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  tenantId: string;
  createdAt: string;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: ProjectRole;
}
