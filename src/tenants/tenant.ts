export type TenantRole = 'owner' | 'member';

export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
}

export interface TenantMembership extends Tenant {
  role: TenantRole;
}
