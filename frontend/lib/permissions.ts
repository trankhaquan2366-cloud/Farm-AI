export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  TECHNICIAN: 'technician',
  STAFF: 'staff',
}

export const PERMISSIONS = {
  PLOT_CREATE: 'plot:create',
  PLOT_UPDATE: 'plot:update',
  PLOT_DELETE: 'plot:delete',
  BATCH_CREATE: 'batch:create',
  BATCH_UPDATE: 'batch:update',
  BATCH_DELETE: 'batch:delete',
  LOG_CREATE: 'log:create',
  LOG_DELETE: 'log:delete',
  AI_ASK: 'ai:ask',
  AI_SCHEDULE: 'ai:schedule',
}

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.MANAGER]: Object.values(PERMISSIONS),
  [ROLES.TECHNICIAN]: [
    PERMISSIONS.PLOT_CREATE,
    PERMISSIONS.PLOT_UPDATE,
    PERMISSIONS.PLOT_DELETE,
    PERMISSIONS.BATCH_CREATE,
    PERMISSIONS.BATCH_UPDATE,
    PERMISSIONS.BATCH_DELETE,
    PERMISSIONS.LOG_CREATE,
    PERMISSIONS.AI_ASK,
    PERMISSIONS.AI_SCHEDULE,
  ],
  [ROLES.STAFF]: [
    PERMISSIONS.LOG_CREATE, // Đã mở khóa quyền ghi nhật ký cho Nhân viên
    PERMISSIONS.AI_ASK,     // Đã mở khóa quyền sử dụng AI cho Nhân viên
  ],
}

export function checkPermission(role: string, permission: string): boolean {
  if (!role) return false
  const userRole = role.toLowerCase()
  const permissions = ROLE_PERMISSIONS[userRole]
  return permissions ? permissions.includes(permission) : false
}