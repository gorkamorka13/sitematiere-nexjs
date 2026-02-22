import { db } from '@/lib/db';
import { projectPermissions, projects, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { UserRole } from '@/lib/auth-types';

export type PermissionLevel = 'READ' | 'WRITE' | 'MANAGE';

export interface ProjectAccess {
  hasAccess: boolean;
  level: PermissionLevel | 'OWNER' | 'ADMIN' | null;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
}

export const PermissionLevelConfig = {
  READ: {
    label: 'Lecture',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    canRead: true,
    canWrite: false,
    canDelete: false,
    canManagePermissions: false,
  },
  WRITE: {
    label: 'Écriture',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    canRead: true,
    canWrite: true,
    canDelete: false,
    canManagePermissions: false,
  },
  MANAGE: {
    label: 'Gestion',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    canRead: true,
    canWrite: true,
    canDelete: true,
    canManagePermissions: true,
  },
  OWNER: {
    label: 'Propriétaire',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    canRead: true,
    canWrite: true,
    canDelete: true,
    canManagePermissions: true,
  },
  ADMIN: {
    label: 'Administrateur',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    canRead: true,
    canWrite: true,
    canDelete: true,
    canManagePermissions: true,
  },
} as const;

export function getAccessConfig(level: PermissionLevel | 'OWNER' | 'ADMIN' | null) {
  if (!level) return null;
  return PermissionLevelConfig[level];
}

export async function getProjectAccess(
  userId: string,
  userRole: UserRole,
  projectId: string,
  projectOwnerId: string
): Promise<ProjectAccess> {
  if (userRole === 'ADMIN') {
    return {
      hasAccess: true,
      level: 'ADMIN',
      canRead: true,
      canWrite: true,
      canDelete: true,
      canManagePermissions: true,
    };
  }

  if (projectOwnerId === userId) {
    return {
      hasAccess: true,
      level: 'OWNER',
      canRead: true,
      canWrite: true,
      canDelete: true,
      canManagePermissions: true,
    };
  }

  const permission = await db
    .select()
    .from(projectPermissions)
    .where(
      and(
        eq(projectPermissions.projectId, projectId),
        eq(projectPermissions.userId, userId)
      )
    )
    .limit(1);

  if (permission.length === 0) {
    return {
      hasAccess: false,
      level: null,
      canRead: false,
      canWrite: false,
      canDelete: false,
      canManagePermissions: false,
    };
  }

  const perm = permission[0];
  const config = PermissionLevelConfig[perm.level as PermissionLevel];

  return {
    hasAccess: true,
    level: perm.level as PermissionLevel,
    canRead: config.canRead,
    canWrite: config.canWrite,
    canDelete: config.canDelete,
    canManagePermissions: config.canManagePermissions,
  };
}

export async function getAccessibleProjectIds(
  userId: string,
  userRole: UserRole
): Promise<{ projectId: string; access: ProjectAccess }[]> {
  if (userRole === 'ADMIN') {
    const allProjects = await db.select({ id: projects.id, ownerId: projects.ownerId }).from(projects);
    return allProjects.map(p => ({
      projectId: p.id,
      access: {
        hasAccess: true,
        level: 'ADMIN',
        canRead: true,
        canWrite: true,
        canDelete: true,
        canManagePermissions: true,
      },
    }));
  }

  const ownedProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.ownerId, userId));

  const permissions = await db
    .select()
    .from(projectPermissions)
    .where(eq(projectPermissions.userId, userId));

  const result: { projectId: string; access: ProjectAccess }[] = [];

  for (const p of ownedProjects) {
    result.push({
      projectId: p.id,
      access: {
        hasAccess: true,
        level: 'OWNER',
        canRead: true,
        canWrite: true,
        canDelete: true,
        canManagePermissions: true,
      },
    });
  }

  for (const perm of permissions) {
    if (!result.find(r => r.projectId === perm.projectId)) {
      const config = PermissionLevelConfig[perm.level as PermissionLevel];
      result.push({
        projectId: perm.projectId,
        access: {
          hasAccess: true,
          level: perm.level as PermissionLevel,
          canRead: config.canRead,
          canWrite: config.canWrite,
          canDelete: config.canDelete,
          canManagePermissions: config.canManagePermissions,
        },
      });
    }
  }

  return result;
}

export async function getProjectPermissions(projectId: string) {
  return db
    .select({
      id: projectPermissions.id,
      level: projectPermissions.level,
      createdAt: projectPermissions.createdAt,
      user: {
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        role: users.role,
        color: users.color,
      },
    })
    .from(projectPermissions)
    .innerJoin(users, eq(projectPermissions.userId, users.id))
    .where(eq(projectPermissions.projectId, projectId));
}

export async function getUserPermissions(userId: string) {
  return db
    .select({
      id: projectPermissions.id,
      level: projectPermissions.level,
      createdAt: projectPermissions.createdAt,
      project: {
        id: projects.id,
        name: projects.name,
        type: projects.type,
        status: projects.status,
        country: projects.country,
      },
    })
    .from(projectPermissions)
    .innerJoin(projects, eq(projectPermissions.projectId, projects.id))
    .where(eq(projectPermissions.userId, userId));
}

export async function checkPermission(
  userId: string,
  userRole: UserRole,
  projectId: string,
  requiredLevel: 'READ' | 'WRITE' | 'MANAGE'
): Promise<boolean> {
  const access = await getProjectAccess(userId, userRole, projectId, '');
  
  if (!access.hasAccess) return false;
  
  if (requiredLevel === 'READ') return access.canRead;
  if (requiredLevel === 'WRITE') return access.canWrite;
  if (requiredLevel === 'MANAGE') return access.canDelete;
  
  return false;
}
