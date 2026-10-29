export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  TECHNICIAN: 'TECHNICIAN',
  WORKER: 'WORKER',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_MANAGE: 'users:manage',
  PLOT_READ: 'plots:read',
  PLOT_CREATE: 'plots:create',
  PLOT_UPDATE: 'plots:update',
  PLOT_DELETE: 'plots:delete',
  PLOT_ASSIGN: 'plots:assign',
  VARIETY_READ: 'plant_varieties:read',
  VARIETY_CREATE: 'plant_varieties:create',
  VARIETY_UPDATE: 'plant_varieties:update',
  VARIETY_DELETE: 'plant_varieties:delete',
  BATCH_READ: 'crop_batches:read',
  BATCH_CREATE: 'crop_batches:create',
  BATCH_UPDATE: 'crop_batches:update',
  BATCH_DELETE: 'crop_batches:delete',
  CARE_LOG_READ: 'care_logs:read',
  CARE_LOG_CREATE: 'care_logs:create',
  CARE_LOG_UPDATE: 'care_logs:update',
  CARE_LOG_DELETE: 'care_logs:delete',
  CARE_LOG_APPROVE: 'care_logs:approve',
  SUPPLY_READ: 'supplies:read',
  SUPPLY_REPORT: 'supplies:report',
  SUPPLY_CREATE: 'supplies:create',
  SUPPLY_UPDATE: 'supplies:update',
  SUPPLY_DELETE: 'supplies:delete',
  SUPPLY_APPROVE: 'supplies:approve',
  TRACEABILITY_READ: 'traceability:read',
  TRACEABILITY_CREATE: 'traceability:create',
  AI_ASK: 'ai:ask',
  AI_SCHEDULE: 'ai:schedule',

  // Compatibility keys used by existing dashboard pages.
  CROP_LOT_CREATE: 'plots:create',
  CROP_LOT_UPDATE: 'plots:update',
  CROP_LOT_DELETE: 'plots:delete',
  LOG_CREATE: 'care_logs:create',
  LOG_DELETE: 'care_logs:delete',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

const ALL_PERMISSIONS = [...new Set(Object.values(PERMISSIONS))]

const ROLE_PERMISSIONS: Record<Role, readonly string[]> = {
  [ROLES.ADMIN]: ALL_PERMISSIONS,
  [ROLES.MANAGER]: ALL_PERMISSIONS,
  [ROLES.TECHNICIAN]: [
    PERMISSIONS.PLOT_READ,
    PERMISSIONS.VARIETY_READ,
    PERMISSIONS.BATCH_READ,
    PERMISSIONS.BATCH_CREATE,
    PERMISSIONS.BATCH_UPDATE,
    PERMISSIONS.BATCH_DELETE,
    PERMISSIONS.CARE_LOG_READ,
    PERMISSIONS.CARE_LOG_CREATE,
    PERMISSIONS.CARE_LOG_UPDATE,
    PERMISSIONS.CARE_LOG_APPROVE,
    PERMISSIONS.SUPPLY_READ,
    PERMISSIONS.TRACEABILITY_READ,
    PERMISSIONS.TRACEABILITY_CREATE,
    PERMISSIONS.AI_ASK,
    PERMISSIONS.AI_SCHEDULE,
  ],
  [ROLES.WORKER]: [
    PERMISSIONS.PLOT_READ,
    PERMISSIONS.BATCH_READ,
    PERMISSIONS.CARE_LOG_READ,
    PERMISSIONS.CARE_LOG_CREATE,
    PERMISSIONS.SUPPLY_READ,
    PERMISSIONS.SUPPLY_REPORT,
    PERMISSIONS.AI_ASK,
  ],
}

export function normalizeRole(value: unknown): Role | null {
  if (typeof value !== 'string') return null

  const role = value.trim().toUpperCase()
  if (role === 'STAFF' || role === 'EMPLOYEE' || role === 'WORKER') return ROLES.WORKER
  if (role === 'TECH' || role === 'KY_THUAT_VIEN' || role === 'KỸ THUẬT VIÊN') {
    return ROLES.TECHNICIAN
  }
  if (role === 'ADMINISTRATOR' || role === 'QUAN_TRI_VIEN') return ROLES.ADMIN
  if (role in ROLE_PERMISSIONS) return role as Role
  return null
}

export function hasPermission(role: unknown, permission: string): boolean {
  const normalizedRole = normalizeRole(role)
  return normalizedRole ? ROLE_PERMISSIONS[normalizedRole].includes(permission) : false
}

export function checkPermission(role: unknown, permission: string): boolean {
  return hasPermission(role, permission)
}
